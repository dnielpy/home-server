import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  type Download,
  type DownloadDestination,
  type DownloadStatus,
  downloadDestinationSchema,
  downloadsResponseSchema,
} from "@home-server/contracts/downloads";
import type { UserRecord } from "../auth/auth.types";
import { UserStorageService } from "../storage/user-storage.service";
import {
  addAria2Download,
  getAria2Snapshot,
  getDownloadFileName,
  pauseAria2Download,
  removeAria2Download,
  resumeAria2Download,
  saveAria2Session,
} from "./aria2.client";
import type { Aria2Download } from "./aria2.types";
import { DownloadsRepository, type DownloadRow, type DownloadAttemptRow } from "./downloads.repository";
import { getDownloadLibraryStatus } from "./utils/formats";
import { initialDownloadFileName, validateDownloadUrl } from "./utils/validation";

const TERMINAL = new Set<DownloadStatus>(["complete", "error", "removed"]);
const ALLOWED: Record<DownloadStatus, string[]> = {
  active: ["pause", "cancel"],
  waiting: ["pause", "cancel"],
  paused: ["resume", "cancel"],
  complete: [],
  error: ["retry"],
  removed: ["retry"],
};
const parseNonNegative = (value: string | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

@Injectable()
export class DownloadsService {
  public constructor(
    @Inject(DownloadsRepository) private readonly repository: DownloadsRepository,
    @Inject(UserStorageService) private readonly storage: UserStorageService,
  ) {}

  public async assertUserCanChangeStorage(userId: string) {
    if (await this.repository.hasActive(userId))
      throw new ConflictException("No se puede cambiar o eliminar el usuario mientras tenga descargas en curso.");
  }

  public async create(user: UserRecord, value: unknown, destinationValue: unknown) {
    const parsedDestination = downloadDestinationSchema.safeParse(destinationValue);
    if (!parsedDestination.success) throw new BadRequestException("El destino debe ser Gallery o LocalTube.");
    const url = validateDownloadUrl(value);
    await this.storage.ensureDownloadDirectory(user.name, parsedDestination.data);
    const ariaDirectory = this.storage.aria2DownloadDirectory(user.name, parsedDestination.data);
    const gid = await addAria2Download(url, ariaDirectory);
    try {
      const record = await this.repository.create({
        userId: user.id,
        gid,
        url,
        destination: parsedDestination.data,
        fileName: initialDownloadFileName(url),
        now: new Date(),
      });
      await this.saveSessionBestEffort();
      if (!record) throw new InternalServerErrorException("No se pudo guardar la descarga.");
      return this.toDownload(record.row, record.attempts);
    } catch (error) {
      await removeAria2Download(gid).catch(() => undefined);
      throw error;
    }
  }

  public async dashboard(user: UserRecord) {
    const snapshot = await getAria2Snapshot();
    const current = new Map(snapshot.downloads.map((download) => [download.gid, download]));
    const records = await this.repository.list(user.id);
    const downloads: Download[] = [];
    for (const record of records)
      downloads.push(await this.reconcileRecord(user, record.row, record.attempts, current.get(record.row.gid)));
    const live = downloads.filter((download) => download.status === "active" || download.status === "waiting");
    return downloadsResponseSchema.parse({
      downloads,
      stats: {
        downloadSpeedBytesPerSecond: live.reduce((total, download) => total + download.speedBytesPerSecond, 0),
        active: downloads.filter((download) => download.status === "active").length,
        waiting: downloads.filter((download) => download.status === "waiting").length,
        stopped: downloads.filter((download) => TERMINAL.has(download.status)).length,
      },
    });
  }

  public async pause(user: UserRecord, id: string) {
    return this.action(user, id, "pause", pauseAria2Download, "paused");
  }
  public async resume(user: UserRecord, id: string) {
    return this.action(user, id, "resume", resumeAria2Download, "waiting");
  }

  public async cancel(user: UserRecord, id: string) {
    const record = await this.requireAction(user.id, id, "cancel");
    await removeAria2Download(record.row.gid);
    const now = new Date();
    const updated = await this.repository.updateOwned(user.id, id, {
      status: "removed",
      errorMessage: null,
      updatedAt: now,
    });
    await this.repository.updateAttempt(record.row.gid, "removed", null, now);
    await this.saveSessionBestEffort();
    return this.requireResult(updated);
  }

  public async retry(user: UserRecord, id: string) {
    const record = await this.requireAction(user.id, id, "retry");
    const destination = this.parseDestination(record.row.destination);
    const ariaDirectory = this.storage.aria2DownloadDirectory(user.name, destination);
    const gid = await addAria2Download(record.row.url, ariaDirectory, record.row.fileName);
    const now = new Date();
    await this.repository.updateOwned(user.id, id, {
      gid,
      totalBytes: 0,
      completedBytes: 0,
      status: "waiting",
      libraryStatus: "pending",
      errorMessage: null,
      updatedAt: now,
    });
    const updated = await this.repository.appendAttempt(user.id, id, { gid, now });
    await this.saveSessionBestEffort();
    return this.requireResult(updated);
  }

  private async action(
    user: UserRecord,
    id: string,
    action: "pause" | "resume",
    rpc: (gid: string) => Promise<string>,
    status: DownloadStatus,
  ) {
    const record = await this.requireAction(user.id, id, action);
    await rpc(record.row.gid);
    const now = new Date();
    const updated = await this.repository.updateOwned(user.id, id, { status, errorMessage: null, updatedAt: now });
    await this.repository.updateAttempt(record.row.gid, status, null, null);
    await this.saveSessionBestEffort();
    return this.requireResult(updated);
  }

  private async requireAction(userId: string, id: string, action: string) {
    const record = await this.repository.findOwned(userId, id);
    if (!record) throw new NotFoundException("Descarga no encontrada.");
    if (!ALLOWED[record.row.status as DownloadStatus]?.includes(action))
      throw new ConflictException(`La descarga no se puede ${action} en su estado actual.`);
    return record;
  }

  private requireResult<T>(record: T | null): T {
    if (!record) throw new InternalServerErrorException("La descarga cambió antes de guardar su estado.");
    return record;
  }

  private parseDestination(value: string): DownloadDestination {
    const parsed = downloadDestinationSchema.safeParse(value);
    if (!parsed.success) throw new InternalServerErrorException("El destino guardado no es válido.");
    return parsed.data;
  }

  private async reconcileRecord(
    user: UserRecord,
    row: DownloadRow,
    attempts: DownloadAttemptRow[],
    aria: Aria2Download | undefined,
  ) {
    const event = aria ? null : await this.readTerminalEvent(row.gid);
    const nextStatus = (event?.status ?? aria?.status ?? row.status) as DownloadStatus;
    const totalBytes = aria ? parseNonNegative(aria.totalLength) : row.totalBytes;
    const completedBytes = aria ? parseNonNegative(aria.completedLength) : row.completedBytes;
    const errorMessage = aria?.errorMessage?.trim() || (nextStatus === "error" ? row.errorMessage : null);
    const fileName = aria ? getDownloadFileName(aria, row.fileName) : event?.fileName || row.fileName;
    const libraryStatus = nextStatus === "complete" ? this.libraryStatus(row.destination, fileName) : row.libraryStatus;
    const changed =
      row.status !== nextStatus ||
      row.fileName !== fileName ||
      row.totalBytes !== totalBytes ||
      row.completedBytes !== completedBytes ||
      row.errorMessage !== errorMessage ||
      row.libraryStatus !== libraryStatus;
    if (changed) {
      const now = new Date();
      await this.repository.updateOwned(user.id, row.id, {
        status: nextStatus,
        fileName,
        totalBytes,
        completedBytes,
        errorMessage,
        libraryStatus,
        updatedAt: now,
      });
      await this.repository.updateAttempt(row.gid, nextStatus, errorMessage, TERMINAL.has(nextStatus) ? now : null);
    }
    const speedBytesPerSecond = aria ? parseNonNegative(aria.downloadSpeed) : 0;
    const etaSeconds =
      speedBytesPerSecond > 0 ? Math.ceil(Math.max(0, totalBytes - completedBytes) / speedBytesPerSecond) : null;
    const responseAttempts = attempts.map((attempt) =>
      attempt.gid === row.gid
        ? {
            ...attempt,
            status: nextStatus,
            errorMessage,
            finishedAt: TERMINAL.has(nextStatus) ? (attempt.finishedAt ?? new Date()) : null,
          }
        : attempt,
    );
    return this.toDownload(
      {
        ...row,
        status: nextStatus,
        fileName,
        totalBytes,
        completedBytes,
        errorMessage,
        libraryStatus,
        updatedAt: changed ? new Date() : row.updatedAt,
      },
      responseAttempts,
      speedBytesPerSecond,
      etaSeconds,
    );
  }

  private toDownload(
    row: DownloadRow,
    attempts: DownloadAttemptRow[],
    speedBytesPerSecond = 0,
    etaSeconds: number | null = null,
  ): Download {
    const progress = row.totalBytes > 0 ? Math.min(100, (row.completedBytes / row.totalBytes) * 100) : 0;
    return {
      id: row.id,
      gid: row.gid,
      url: row.url,
      destination: this.parseDestination(row.destination),
      fileName: row.fileName,
      totalBytes: row.totalBytes,
      completedBytes: row.completedBytes,
      progress,
      speedBytesPerSecond,
      etaSeconds,
      status: row.status as DownloadStatus,
      libraryStatus: row.libraryStatus as Download["libraryStatus"],
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      attempts: attempts.map((attempt) => ({
        gid: attempt.gid,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt?.toISOString() ?? null,
        status: attempt.status as DownloadStatus,
        errorMessage: attempt.errorMessage,
      })),
    };
  }

  private libraryStatus(destination: string, fileName: string) {
    return getDownloadLibraryStatus(this.parseDestination(destination), fileName);
  }

  private async readTerminalEvent(gid: string) {
    const directory = process.env.ARIA2_EVENTS_DIR?.trim();
    if (!directory) return null;
    for (const status of ["complete", "error", "removed"] as const) {
      try {
        const fileName = (await readFile(`${directory}/${gid}.${status}`, "utf8")).trim();
        return { status, fileName: fileName ? basename(fileName) : "" };
      } catch {
        /* Marker does not exist. */
      }
    }
    return null;
  }

  private async saveSessionBestEffort() {
    await saveAria2Session().catch(() => undefined);
  }
}
