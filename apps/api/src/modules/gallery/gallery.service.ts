import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, type ReadStream } from "node:fs";
import {
  access,
  constants,
  copyFile,
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
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
} from "@nestjs/common";
import type {
  GalleryAlbum,
  GalleryAlbumSummary,
  GalleryMedia,
  GalleryMediaPage,
  GalleryUploadResult,
} from "@home-server/contracts/gallery";
import sharp from "sharp";
import type { UserRecord } from "../auth/auth.types";
import { UserStorageService } from "../storage/user-storage.service";

const PAGE_SIZE = 60;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const METADATA_CONCURRENCY = 4;
const MAX_NAME_BYTES = 255;
const MEDIA_TYPES = new Map<string, { kind: "image" | "video"; mimeType: string }>([
  [".jpg", { kind: "image", mimeType: "image/jpeg" }],
  [".jpeg", { kind: "image", mimeType: "image/jpeg" }],
  [".png", { kind: "image", mimeType: "image/png" }],
  [".webp", { kind: "image", mimeType: "image/webp" }],
  [".gif", { kind: "image", mimeType: "image/gif" }],
  [".mp4", { kind: "video", mimeType: "video/mp4" }],
  [".webm", { kind: "video", mimeType: "video/webm" }],
]);

type MediaFile = {
  id: string;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  kind: "image" | "video";
  mimeType: string;
  size: number;
  modifiedAtMs: number;
};
type MediaMetadata = { width: number; height: number; durationSeconds: number | null };
type Snapshot = { id: string; userId: string; albumId: string | null; createdAt: number; files: MediaFile[] };
type CursorPayload = { snapshotId: string; userId: string; offset: number; albumId: string | null };
type AlbumDirectory = GalleryAlbum & { absolutePath: string };
type OpenMedia = { stream?: ReadStream; status: 200 | 206 | 416; headers: Record<string, string> };

export function createGalleryMediaId(relativePath: string) {
  return createHash("sha256").update(relativePath).digest("hex").slice(0, 32);
}

export function createGalleryAlbumId(relativePath: string) {
  return createHash("sha256").update(`album:${relativePath}`).digest("hex").slice(0, 32);
}

function encodeCursor(value: CursorPayload) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(value: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as CursorPayload;
    return typeof parsed.snapshotId === "string" &&
      typeof parsed.userId === "string" &&
      Number.isInteger(parsed.offset) &&
      parsed.offset >= 0 &&
      (typeof parsed.albumId === "string" || parsed.albumId === null)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function parseByteRange(header: string | undefined, fileSize: number) {
  if (fileSize <= 0) return null;
  if (!header) return { start: 0, end: fileSize - 1 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const length = Number.parseInt(match[2]!, 10);
    return Number.isInteger(length) && length > 0 ? { start: Math.max(0, fileSize - length), end: fileSize - 1 } : null;
  }
  const start = Number.parseInt(match[1], 10);
  const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= fileSize
  )
    return null;
  return { start, end: Math.min(requestedEnd, fileSize - 1) };
}

@Injectable()
export class GalleryService {
  private readonly snapshots = new Map<string, Snapshot>();
  private readonly metadata = new Map<string, MediaMetadata & { size: number; modifiedAtMs: number }>();

  public constructor(@Inject(UserStorageService) private readonly userStorage: UserStorageService) {}

  public async listMedia(
    user: UserRecord,
    options: { cursor?: string; limit?: number; albumId?: string } = {},
  ): Promise<GalleryMediaPage> {
    this.cleanCaches();
    const decoded = options.cursor ? decodeCursor(options.cursor) : null;
    let snapshot = decoded?.userId === user.id ? this.snapshots.get(decoded.snapshotId) : undefined;
    let offset = decoded?.userId === user.id ? decoded.offset : 0;
    if (!snapshot || snapshot.userId !== user.id || snapshot.albumId !== (options.albumId ?? null)) {
      snapshot = await this.createSnapshot(user, options.albumId);
      offset = 0;
    }
    const limit = Math.min(Math.max(Math.floor(options.limit ?? PAGE_SIZE) || PAGE_SIZE, 1), PAGE_SIZE);
    const files = snapshot.files.slice(offset, offset + limit);
    const items = await this.mapWithConcurrency(files, (file) => this.serializeMedia(file));
    const nextOffset = offset + files.length;
    return {
      items,
      nextCursor:
        nextOffset < snapshot.files.length
          ? encodeCursor({ snapshotId: snapshot.id, userId: user.id, offset: nextOffset, albumId: snapshot.albumId })
          : null,
    };
  }

  public async listAlbums(user: UserRecord): Promise<GalleryAlbumSummary[]> {
    const root = await this.libraryRoot(user);
    const albums = await this.albumDirectories(user, root);
    return this.mapWithConcurrency(albums, async (album) => {
      const files: MediaFile[] = [];
      await this.walk(root, album.absolutePath, files);
      this.sortFiles(files);
      return {
        id: album.id,
        name: album.name,
        itemCount: files.length,
        cover: files[0] ? await this.serializeMedia(files[0]) : null,
      };
    });
  }

  public async openMedia(
    user: UserRecord,
    mediaId: string,
    rangeHeader: string | undefined,
    includeBody: boolean,
  ): Promise<OpenMedia> {
    const media = await this.findMedia(user, mediaId);
    if (!media) throw new NotFoundException("Archivo no encontrado.");
    let fileStats;
    try {
      fileStats = await stat(media.absolutePath);
    } catch {
      throw new NotFoundException("Archivo no encontrado.");
    }
    const headers: Record<string, string> = {
      "cache-control": "private, max-age=0, must-revalidate",
      "content-disposition": this.contentDisposition(media.fileName),
      "content-type": media.mimeType,
    };
    if (media.kind === "image") {
      headers["content-length"] = String(fileStats.size);
      return { status: 200, headers, ...(includeBody ? { stream: createReadStream(media.absolutePath) } : {}) };
    }
    if (fileStats.size === 0) return { status: 416, headers: { ...headers, "content-range": "bytes */0" } };
    const range = parseByteRange(rangeHeader, fileStats.size);
    if (!range) return { status: 416, headers: { ...headers, "content-range": `bytes */${fileStats.size}` } };
    const partial = Boolean(rangeHeader);
    headers["accept-ranges"] = "bytes";
    headers["content-length"] = String(range.end - range.start + 1);
    if (partial) headers["content-range"] = `bytes ${range.start}-${range.end}/${fileStats.size}`;
    return {
      status: partial ? 206 : 200,
      headers,
      ...(includeBody ? { stream: createReadStream(media.absolutePath, { start: range.start, end: range.end }) } : {}),
    };
  }

  public async getThumbnail(user: UserRecord, mediaId: string) {
    const media = await this.findMedia(user, mediaId);
    if (!media) throw new NotFoundException("Archivo no encontrado.");
    const root = await this.libraryRoot(user);
    const cacheRoot = path.join(root, ".cache");
    const cachePath = path.join(
      cacheRoot,
      `${media.id}-${media.size}-${Math.floor(media.modifiedAtMs)}.${media.kind === "image" ? "webp" : "jpg"}`,
    );
    const contentType = media.kind === "image" ? "image/webp" : "image/jpeg";
    try {
      return { body: await readFile(cachePath), contentType };
    } catch {
      // Generate on cache miss.
    }
    // Keep the media extension at the end so ffmpeg can infer the JPEG output format.
    const temporary = `${cachePath}.${randomUUID()}.tmp.${media.kind === "image" ? "webp" : "jpg"}`;
    try {
      await mkdir(cacheRoot, { recursive: true, mode: 0o750 });
      const generated =
        media.kind === "image"
          ? await this.generateImageThumbnail(media.absolutePath, temporary)
          : await this.generateVideoThumbnail(media.absolutePath, temporary);
      if (!generated) return this.fallbackThumbnail(media.kind);
      await rename(temporary, cachePath).catch(async () => unlink(temporary).catch(() => undefined));
      return { body: await readFile(cachePath), contentType };
    } catch {
      return this.fallbackThumbnail(media.kind);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }

  public async saveUpload(
    user: UserRecord,
    body: Readable,
    input: { fileName: string; folderName?: string | null },
  ): Promise<GalleryUploadResult> {
    const fileName = this.validateSegment(input.fileName, "El nombre del archivo");
    const folderName = this.validateFolder(input.folderName);
    const root = await this.libraryRoot(user);
    const directory = await this.destinationDirectory(root, folderName);
    const temporary = path.join(directory, `.gallery-upload-${randomUUID()}.part`);
    try {
      await pipeline(body, createWriteStream(temporary, { flags: "wx", mode: 0o640 }));
      const uploaded = await stat(temporary);
      const storedName = await this.publishWithoutOverwrite(temporary, directory, fileName);
      this.clearUserCaches(user.id);
      return { fileName: storedName, folderName, size: uploaded.size };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOSPC")
        throw new InternalServerErrorException("No hay espacio suficiente para guardar el archivo.");
      if (code === "EACCES" || code === "EPERM" || code === "EROFS")
        throw new InternalServerErrorException("La biblioteca Gallery no permite escritura.");
      throw error;
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }

  private async createSnapshot(user: UserRecord, albumId?: string) {
    const files = await this.scan(user, albumId);
    const snapshot: Snapshot = {
      id: randomUUID(),
      userId: user.id,
      albumId: albumId ?? null,
      createdAt: Date.now(),
      files,
    };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  private async findMedia(user: UserRecord, mediaId: string) {
    this.cleanCaches();
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.userId !== user.id) continue;
      const match = snapshot.files.find((file) => file.id === mediaId);
      if (match) return match;
    }
    const files = await this.scan(user);
    return files.find((file) => file.id === mediaId) ?? null;
  }

  private async scan(user: UserRecord, albumId?: string) {
    const root = await this.libraryRoot(user);
    let scanRoot = root;
    if (albumId) {
      const album = (await this.albumDirectories(user, root)).find((candidate) => candidate.id === albumId);
      if (!album) throw new NotFoundException("Álbum no encontrado.");
      scanRoot = album.absolutePath;
    }
    const files: MediaFile[] = [];
    await this.walk(root, scanRoot, files);
    this.sortFiles(files);
    return files;
  }

  private async libraryRoot(user: UserRecord) {
    const root = await this.userStorage.ensureGalleryDirectory(user.name);
    const details = await lstat(root).catch(() => null);
    if (!details?.isDirectory() || details.isSymbolicLink())
      throw new InternalServerErrorException("La biblioteca Gallery no está disponible.");
    return root;
  }

  private async albumDirectories(_user: UserRecord, root: string): Promise<AlbumDirectory[]> {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => {
      throw new InternalServerErrorException("La biblioteca Gallery no está disponible.");
    });
    return entries
      .filter((entry) => !entry.name.startsWith(".") && entry.isDirectory() && !entry.isSymbolicLink())
      .map((entry) => ({
        id: createGalleryAlbumId(entry.name),
        name: entry.name,
        absolutePath: path.join(root, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.name.localeCompare(b.name));
  }

  private async walk(root: string, directory: string, files: MediaFile[]): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await this.walk(root, absolutePath, files);
        continue;
      }
      const type = entry.isFile() ? MEDIA_TYPES.get(path.extname(entry.name).toLowerCase()) : undefined;
      if (!type) continue;
      try {
        const details = await stat(absolutePath);
        const relativePath = path.relative(root, absolutePath);
        files.push({
          id: createGalleryMediaId(relativePath),
          absolutePath,
          relativePath,
          fileName: entry.name,
          kind: type.kind,
          mimeType: type.mimeType,
          size: details.size,
          modifiedAtMs: details.mtimeMs,
        });
      } catch {
        // A file may disappear while a scan is active.
      }
    }
  }

  private async serializeMedia(file: MediaFile): Promise<GalleryMedia> {
    const metadata = await this.readMetadata(file);
    return {
      id: file.id,
      kind: file.kind,
      fileName: file.fileName,
      mimeType: file.mimeType,
      width: metadata.width,
      height: metadata.height,
      modifiedAt: new Date(file.modifiedAtMs).toISOString(),
      size: file.size,
      durationSeconds: metadata.durationSeconds,
    };
  }

  private async readMetadata(file: MediaFile): Promise<MediaMetadata> {
    const cached = this.metadata.get(file.absolutePath);
    if (cached && cached.size === file.size && cached.modifiedAtMs === file.modifiedAtMs) return cached;
    let metadata: MediaMetadata = { width: 1, height: 1, durationSeconds: null };
    if (file.kind === "image") {
      try {
        const image = await sharp(file.absolutePath, { animated: false }).metadata();
        const swapsAxes = image.orientation !== undefined && image.orientation >= 5 && image.orientation <= 8;
        metadata = {
          width: Math.max(1, swapsAxes ? (image.height ?? 1) : (image.width ?? 1)),
          height: Math.max(1, swapsAxes ? (image.width ?? 1) : (image.height ?? 1)),
          durationSeconds: null,
        };
      } catch {
        // Corrupt images retain a safe neutral aspect ratio.
      }
    } else {
      const output = await this.runCommand("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:format=duration",
        "-of",
        "json",
        file.absolutePath,
      ]);
      try {
        const parsed = JSON.parse(output) as {
          streams?: Array<{ width?: number; height?: number }>;
          format?: { duration?: string };
        };
        const stream = parsed.streams?.[0];
        const duration = Number.parseFloat(parsed.format?.duration ?? "");
        metadata = {
          width: Math.max(1, stream?.width ?? 16),
          height: Math.max(1, stream?.height ?? 9),
          durationSeconds: Number.isFinite(duration) ? duration : null,
        };
      } catch {
        metadata = { width: 16, height: 9, durationSeconds: null };
      }
    }
    this.metadata.set(file.absolutePath, { ...metadata, size: file.size, modifiedAtMs: file.modifiedAtMs });
    return metadata;
  }

  private async generateImageThumbnail(input: string, output: string) {
    try {
      await sharp(input, { animated: false })
        .rotate()
        .resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, alphaQuality: 90 })
        .toFile(output);
      return true;
    } catch {
      return false;
    }
  }

  private generateVideoThumbnail(input: string, output: string) {
    return new Promise<boolean>((resolve) => {
      const child = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          "0.5",
          "-i",
          input,
          "-frames:v",
          "1",
          "-vf",
          "scale='min(960,iw)':-2",
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

  private fallbackThumbnail(kind: MediaFile["kind"]) {
    const icon =
      kind === "video"
        ? '<path d="M278 142v76l68-38z" fill="#9aa0a6"/>'
        : '<path d="M232 214l48-52 34 34 22-24 72 72H232z" fill="#9aa0a6"/><circle cx="348" cy="134" r="18" fill="#9aa0a6"/>';
    return {
      body: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#202124"/>${icon}</svg>`,
      ),
      contentType: "image/svg+xml; charset=utf-8",
    };
  }

  private async destinationDirectory(root: string, folderName: string | null) {
    await access(root, constants.W_OK).catch(() => {
      throw new InternalServerErrorException("La biblioteca Gallery no permite escritura.");
    });
    if (!folderName) return root;
    const destination = path.join(root, folderName);
    await mkdir(destination, { mode: 0o750 }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    const details = await lstat(destination);
    if (!details.isDirectory() || details.isSymbolicLink())
      throw new BadRequestException("La carpeta de destino no está disponible.");
    return destination;
  }

  private async publishWithoutOverwrite(temporary: string, directory: string, fileName: string) {
    for (let index = 0; index < 10_000; index += 1) {
      const extension = path.extname(fileName);
      const candidate = index === 0 ? fileName : `${path.basename(fileName, extension)} (${index})${extension}`;
      const destination = path.join(directory, candidate);
      try {
        await link(temporary, destination);
        return candidate;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EEXIST") continue;
        if (!["EPERM", "ENOSYS", "EOPNOTSUPP", "EXDEV"].includes(code ?? "")) throw error;
      }
      try {
        await copyFile(temporary, destination, constants.COPYFILE_EXCL);
        return candidate;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
    }
    throw new ConflictException("No se pudo elegir un nombre de archivo disponible.");
  }

  private validateFolder(value: string | null | undefined) {
    if (!value?.trim()) return null;
    const folder = this.validateSegment(value, "El nombre de la carpeta");
    if (folder.startsWith(".")) throw new BadRequestException("La carpeta no puede ser oculta.");
    return folder;
  }

  private validateSegment(value: string, label: string) {
    const trimmed = value.trim().normalize("NFC");
    if (!trimmed || trimmed === "." || trimmed === "..") throw new BadRequestException(`${label} es obligatorio.`);
    if (/[\\/\u0000-\u001f\u007f]/.test(trimmed))
      throw new BadRequestException(`${label} contiene caracteres no válidos.`);
    if (Buffer.byteLength(trimmed, "utf8") > MAX_NAME_BYTES)
      throw new BadRequestException(`${label} es demasiado largo.`);
    return trimmed;
  }

  private contentDisposition(fileName: string) {
    const ascii = fileName.replace(/[^ -~]/g, "_").replace(/"/g, "'");
    return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
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

  private async mapWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>) {
    const result = new Array<R>(items.length);
    let next = 0;
    const run = async () => {
      while (next < items.length) {
        const index = next++;
        result[index] = await worker(items[index]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(METADATA_CONCURRENCY, items.length) }, run));
    return result;
  }

  private sortFiles(files: MediaFile[]) {
    files.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs || a.relativePath.localeCompare(b.relativePath));
  }

  private cleanCaches() {
    const now = Date.now();
    for (const [id, snapshot] of this.snapshots)
      if (now - snapshot.createdAt > SNAPSHOT_TTL_MS) this.snapshots.delete(id);
  }

  private clearUserCaches(userId: string) {
    for (const [id, snapshot] of this.snapshots) if (snapshot.userId === userId) this.snapshots.delete(id);
    this.metadata.clear();
  }
}
