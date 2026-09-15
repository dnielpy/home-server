import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, type ReadStream } from "node:fs";
import {
  access,
  constants,
  copyFile,
  link,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import type { LocalTubeUploadResult, LocalTubeVideo, LocalTubeVideoPage } from "@home-server/contracts/localtube";
import type { UserRecord } from "../auth/auth.types";
import { UserStorageService } from "../storage/user-storage.service";

const PAGE_SIZE = 12;
const SUGGESTION_LIMIT = 8;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const MAX_NAME_BYTES = 255;
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);
const YTDOWN_YOUTUBE_PREFIX = /^YTDown(?:[._\s-]*com)?[._\s-]+YouTube[._\s-]+/i;
const YTDOWN_MEDIA_SUFFIX = /[._\s-]+Media(?:[._\s-].*)?$/i;

type VideoFile = {
  id: string;
  absolutePath: string;
  relativePath: string;
  title: string;
  folder: string;
  size: number;
  modifiedAtMs: number;
};

type LibrarySnapshot = {
  id: string;
  userId: string;
  query: string;
  createdAt: number;
  files: VideoFile[];
};

type CursorPayload = {
  snapshotId: string;
  userId: string;
  offset: number;
  query: string;
  excludeId?: string;
};

type OpenVideo = {
  stream?: ReadStream;
  status: 200 | 206 | 416;
  headers: Record<string, string>;
};

export function formatLocalTubeTitle(value: string) {
  return value
    .normalize("NFC")
    .replace(YTDOWN_YOUTUBE_PREFIX, "")
    .replace(YTDOWN_MEDIA_SUFFIX, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

@Injectable()
export class LocalTubeService {
  private readonly snapshots = new Map<string, LibrarySnapshot>();
  private readonly durationCache = new Map<string, { size: number; modifiedAtMs: number; seconds: number | null }>();

  public constructor(@Inject(UserStorageService) private readonly userStorage: UserStorageService) {}

  public async listVideos(
    user: UserRecord,
    options: { query?: string; cursor?: string; limit?: number; excludeId?: string } = {},
  ): Promise<LocalTubeVideoPage> {
    const query = options.query?.trim() ?? "";
    const decodedCursor = options.cursor ? this.decodeCursor(options.cursor) : null;
    const safeLimit = Math.min(Math.max(Math.floor(options.limit ?? PAGE_SIZE) || PAGE_SIZE, 1), PAGE_SIZE);
    let snapshot: LibrarySnapshot | undefined;
    let offset = 0;
    let effectiveQuery = query;
    let effectiveExcludeId = options.excludeId;

    if (decodedCursor?.userId === user.id) {
      snapshot = this.snapshots.get(decodedCursor.snapshotId);
      if (snapshot?.userId !== user.id) snapshot = undefined;
      offset = decodedCursor.offset;
      effectiveQuery = decodedCursor.query;
      effectiveExcludeId = decodedCursor.excludeId;
    }

    if (!snapshot) snapshot = await this.createSnapshot(user, effectiveQuery, effectiveExcludeId);

    const pageFiles = snapshot.files.slice(offset, offset + safeLimit);
    const items = await Promise.all(pageFiles.map((file) => this.serializeVideo(file)));
    const nextOffset = offset + pageFiles.length;
    const nextCursor =
      nextOffset < snapshot.files.length
        ? this.encodeCursor({
            snapshotId: snapshot.id,
            userId: user.id,
            offset: nextOffset,
            query: snapshot.query,
            excludeId: effectiveExcludeId,
          })
        : null;

    return { items, nextCursor };
  }

  public async suggestTitles(user: UserRecord, query: string): Promise<string[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    const files = await this.scanLibrary(user, normalizedQuery);
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const file of files) {
      const title = this.formatTitle(file.title);
      const normalized = title.toLocaleLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      suggestions.push(title);
      if (suggestions.length >= SUGGESTION_LIMIT) break;
    }
    return suggestions;
  }

  public async getVideo(user: UserRecord, videoId: string): Promise<LocalTubeVideo> {
    const file = await this.getVideoFile(user, videoId);
    if (!file) throw new NotFoundException("Vídeo no encontrado.");
    return this.serializeVideo(file);
  }

  public async openVideo(
    user: UserRecord,
    videoId: string,
    rangeHeader: string | undefined,
    download: boolean,
    includeBody: boolean,
  ): Promise<OpenVideo> {
    const video = await this.getVideoFile(user, videoId);
    if (!video) throw new NotFoundException("Vídeo no encontrado.");
    let fileStats;
    try {
      fileStats = await stat(video.absolutePath);
    } catch {
      throw new NotFoundException("Vídeo no encontrado.");
    }
    if (fileStats.size === 0) {
      return { status: 416, headers: { "content-range": "bytes */0" } };
    }
    const range = this.parseRange(rangeHeader, fileStats.size);
    if (!range) {
      return { status: 416, headers: { "content-range": `bytes */${fileStats.size}` } };
    }
    const isPartial = Boolean(rangeHeader);
    const contentLength = range.end - range.start + 1;
    const headers: Record<string, string> = {
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=0, must-revalidate",
      "content-disposition": this.contentDisposition(path.basename(video.absolutePath), download),
      "content-length": String(contentLength),
      "content-type": this.mimeType(video.absolutePath),
    };
    if (isPartial) headers["content-range"] = `bytes ${range.start}-${range.end}/${fileStats.size}`;
    return {
      status: isPartial ? 206 : 200,
      headers,
      ...(includeBody ? { stream: createReadStream(video.absolutePath, { start: range.start, end: range.end }) } : {}),
    };
  }

  public async getThumbnail(
    user: UserRecord,
    videoId: string,
  ): Promise<{ body: Buffer | string; contentType: string }> {
    const video = await this.getVideoFile(user, videoId);
    if (!video) throw new NotFoundException("Vídeo no encontrado.");
    const cacheDirectory = path.join(await this.libraryRoot(user), ".cache");
    const cachePath = path.join(cacheDirectory, `${video.id}-${video.size}-${Math.floor(video.modifiedAtMs)}.jpg`);
    try {
      return { body: await readFile(cachePath), contentType: "image/jpeg" };
    } catch {
      // Generate the thumbnail below when no cached image exists.
    }
    let temporaryPath: string | undefined;
    try {
      await mkdir(cacheDirectory, { recursive: true, mode: 0o750 });
      temporaryPath = `${cachePath}.${randomUUID()}.tmp.jpg`;
      if (!(await this.generateThumbnail(video.absolutePath, temporaryPath))) return this.fallbackThumbnail();
      await rename(temporaryPath, cachePath);
      return { body: await readFile(cachePath), contentType: "image/jpeg" };
    } catch {
      return this.fallbackThumbnail();
    } finally {
      if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
    }
  }

  public async saveUpload(
    user: UserRecord,
    body: Readable,
    input: { fileName: string; folderName?: string | null },
  ): Promise<LocalTubeUploadResult> {
    const fileName = this.validateFileName(input.fileName);
    const folderName = this.validateFolderName(input.folderName);
    const root = await this.libraryRoot(user);
    const directory = await this.destinationDirectory(root, folderName);
    const temporaryPath = path.join(directory, `.localtube-upload-${randomUUID()}.part`);
    try {
      await pipeline(body, createWriteStream(temporaryPath, { flags: "wx", mode: 0o640 }));
      const uploadedStats = await stat(temporaryPath);
      const storedName = await this.publishWithoutOverwrite(temporaryPath, directory, fileName);
      this.clearUserCaches(user.id);
      return { fileName: storedName, folderName, size: uploadedStats.size };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnsupportedMediaTypeException
      )
        throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOSPC") throw new InternalServerErrorException("No hay espacio suficiente para guardar el vídeo.");
      if (code === "EACCES" || code === "EPERM" || code === "EROFS")
        throw new InternalServerErrorException("La biblioteca LocalTube no permite escritura.");
      throw new InternalServerErrorException("No se pudo guardar el vídeo.");
    } finally {
      await unlink(temporaryPath).catch(() => undefined);
    }
  }

  private async libraryRoot(user: UserRecord) {
    const root = await this.userStorage.ensureLocalTubeDirectory(user.name);
    const rootStats = await lstat(root);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink())
      throw new InternalServerErrorException("La biblioteca LocalTube no está disponible.");
    return root;
  }

  private async scanLibrary(user: UserRecord, query: string, excludeId?: string) {
    const root = await this.libraryRoot(user);
    const files: VideoFile[] = [];
    await this.walkDirectory(root, root, files);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return files
      .filter(
        (file) =>
          !normalizedQuery ||
          `${this.formatTitle(file.title)} ${file.title} ${file.relativePath}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
      )
      .filter((file) => file.id !== excludeId)
      .sort(
        (first, second) =>
          second.modifiedAtMs - first.modifiedAtMs || first.relativePath.localeCompare(second.relativePath),
      );
  }

  private async walkDirectory(root: string, directory: string, files: VideoFile[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await this.walkDirectory(root, absolutePath, files);
        continue;
      }
      if (!entry.isFile() || !VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      try {
        const fileStats = await stat(absolutePath);
        const relativePath = path.relative(root, absolutePath);
        const parsed = path.parse(relativePath);
        files.push({
          id: createHash("sha256").update(relativePath).digest("hex").slice(0, 32),
          absolutePath,
          relativePath,
          title: parsed.name,
          folder: path.dirname(relativePath) === "." ? "Biblioteca" : path.dirname(relativePath),
          size: fileStats.size,
          modifiedAtMs: fileStats.mtimeMs,
        });
      } catch {
        // A video can disappear during a filesystem scan.
      }
    }
  }

  private async createSnapshot(user: UserRecord, query: string, excludeId?: string) {
    this.cleanupSnapshots();
    const snapshot: LibrarySnapshot = {
      id: randomUUID(),
      userId: user.id,
      query,
      createdAt: Date.now(),
      files: await this.scanLibrary(user, query, excludeId),
    };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  private async getVideoFile(user: UserRecord, videoId: string) {
    this.cleanupSnapshots();
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.userId !== user.id) continue;
      const found = snapshot.files.find((file) => file.id === videoId);
      if (found) return found;
    }
    const snapshot = await this.createSnapshot(user, "");
    return snapshot.files.find((file) => file.id === videoId) ?? null;
  }

  private async serializeVideo(file: VideoFile): Promise<LocalTubeVideo> {
    return {
      id: file.id,
      title: formatLocalTubeTitle(file.title),
      duration: this.formatDuration(await this.duration(file)),
      modifiedAt: new Date(file.modifiedAtMs).toISOString(),
      folder: file.folder,
      size: file.size,
    };
  }

  private async duration(file: VideoFile) {
    const cached = this.durationCache.get(file.id);
    if (cached && cached.size === file.size && cached.modifiedAtMs === file.modifiedAtMs) return cached.seconds;
    const output = await this.runCommand("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file.absolutePath,
    ]);
    const seconds = Number.parseFloat(output);
    const value = Number.isFinite(seconds) ? seconds : null;
    this.durationCache.set(file.id, { size: file.size, modifiedAtMs: file.modifiedAtMs, seconds: value });
    return value;
  }

  private async destinationDirectory(root: string, folderName: string | null) {
    if (!folderName) return root;
    const destination = path.join(root, folderName);
    try {
      await mkdir(destination, { mode: 0o750 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const destinationStats = await lstat(destination);
    if (!destinationStats.isDirectory() || destinationStats.isSymbolicLink())
      throw new BadRequestException("La carpeta de destino no está disponible.");
    await access(root, constants.W_OK);
    return destination;
  }

  private async publishWithoutOverwrite(temporaryPath: string, directory: string, fileName: string) {
    for (let index = 0; index < 100; index += 1) {
      const extension = path.extname(fileName);
      const candidate = index === 0 ? fileName : `${path.basename(fileName, extension)} (${index})${extension}`;
      const destination = path.join(directory, candidate);
      try {
        await link(temporaryPath, destination);
        return candidate;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EEXIST") continue;
        if (!["EPERM", "ENOSYS", "EOPNOTSUPP", "EXDEV"].includes(code ?? "")) throw error;
      }
      try {
        await copyFile(temporaryPath, destination, constants.COPYFILE_EXCL);
        return candidate;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
    }
    throw new ConflictException("No se pudo elegir un nombre de archivo disponible.");
  }

  private validateFileName(value: string) {
    const name = this.validateSegment(value, "El nombre del archivo");
    if (!VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
      throw new UnsupportedMediaTypeException("Solo se pueden subir vídeos MP4 o WebM.");
    return name;
  }

  private validateFolderName(value: string | null | undefined) {
    if (!value?.trim()) return null;
    const name = this.validateSegment(value, "El nombre de la carpeta");
    if (name.startsWith(".")) throw new BadRequestException("La carpeta no puede ser oculta.");
    return name;
  }

  private validateSegment(value: string, label: string) {
    const trimmed = value.trim().normalize("NFC");
    if (!trimmed || trimmed === "." || trimmed === "..") throw new BadRequestException(`${label} no es válido.`);
    if (/[\\/\u0000-\u001f\u007f]/.test(trimmed))
      throw new BadRequestException(`${label} contiene caracteres no permitidos.`);
    if (Buffer.byteLength(trimmed, "utf8") > MAX_NAME_BYTES)
      throw new BadRequestException(`${label} es demasiado largo.`);
    return trimmed;
  }

  private parseRange(value: string | undefined, fileSize: number) {
    if (!value) return { start: 0, end: fileSize - 1 };
    const match = /^bytes=(\d*)-(\d*)$/.exec(value);
    if (!match) return null;
    const [, startText, endText] = match;
    const start = startText ? Number.parseInt(startText, 10) : fileSize - Number.parseInt(endText, 10);
    let end = endText ? Number.parseInt(endText, 10) : fileSize - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileSize)
      return null;
    end = Math.min(end, fileSize - 1);
    return { start, end };
  }

  private encodeCursor(payload: CursorPayload) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  }

  private decodeCursor(cursor: string): CursorPayload | null {
    try {
      const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
      return typeof value.snapshotId === "string" &&
        typeof value.userId === "string" &&
        typeof value.query === "string" &&
        Number.isInteger(value.offset) &&
        value.offset >= 0
        ? value
        : null;
    } catch {
      return null;
    }
  }

  private cleanupSnapshots() {
    const now = Date.now();
    for (const [id, snapshot] of this.snapshots)
      if (now - snapshot.createdAt > SNAPSHOT_TTL_MS) this.snapshots.delete(id);
  }

  private clearUserCaches(userId: string) {
    for (const [id, snapshot] of this.snapshots) if (snapshot.userId === userId) this.snapshots.delete(id);
    this.durationCache.clear();
  }

  private async generateThumbnail(input: string, output: string) {
    return new Promise<boolean>((resolve) => {
      const child = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          "1",
          "-i",
          input,
          "-frames:v",
          "1",
          "-vf",
          "scale=640:-2",
          "-q:v",
          "4",
          "-y",
          output,
        ],
        { stdio: "ignore" },
      );
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
    });
  }

  private runCommand(command: string, args: string[]) {
    return new Promise<string>((resolve) => {
      const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.on("error", () => resolve(""));
      child.on("close", (code) => resolve(code === 0 ? output.trim() : ""));
    });
  }

  private formatTitle(value: string) {
    return formatLocalTubeTitle(value);
  }
  private formatDuration(seconds: number | null) {
    if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remaining = total % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
      : `${minutes}:${String(remaining).padStart(2, "0")}`;
  }
  private mimeType(filePath: string) {
    return path.extname(filePath).toLowerCase() === ".webm" ? "video/webm" : "video/mp4";
  }
  private contentDisposition(fileName: string, download: boolean) {
    const asciiName = fileName.replace(/[^ -~]/g, "_").replace(/"/g, "'");
    return `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  }
  private fallbackThumbnail() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#1e293b"/><path d="M276 137h88v86h-88zM292 153v54l42-27z" fill="#64748b"/><text x="320" y="260" fill="#94a3b8" font-family="Arial,sans-serif" font-size="18" text-anchor="middle">Sin vista previa</text></svg>';
    return { body: svg, contentType: "image/svg+xml; charset=utf-8" };
  }
}
