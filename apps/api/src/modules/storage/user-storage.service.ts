import { createReadStream } from "node:fs";
import { access, mkdir, readdir, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const APPLICATION_DIRECTORIES = ["local-tube", "gallery"] as const;
type DownloadDestination = "gallery" | "localtube";

export type PhotoUpload = { buffer: Buffer; mimetype: string };

export function parsePhotoData(value: unknown): PhotoUpload | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new UnsupportedMediaTypeException("La foto no es válida.");
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new UnsupportedMediaTypeException("La foto debe ser JPG, PNG o WebP.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_PHOTO_BYTES) throw new PayloadTooLargeException("La foto no puede superar 5 MB.");
  return { buffer, mimetype: match[1] };
}

@Injectable()
export class UserStorageService {
  private readonly root = this.resolveRoot(process.env.EXTERNAL_DISK_MOUNT?.trim() || "./data/external-disk");

  public async ensureUserDirectory(userName: string) {
    const directory = this.userDirectory(userName);
    await mkdir(directory, { recursive: true, mode: 0o750 });
    await Promise.all(
      APPLICATION_DIRECTORIES.map((application) =>
        mkdir(path.join(directory, application), { recursive: true, mode: 0o750 }),
      ),
    );
  }

  public async ensureLocalTubeDirectory(userName: string) {
    await this.ensureUserDirectory(userName);
    return path.join(this.userDirectory(userName), "local-tube");
  }

  public async ensureGalleryDirectory(userName: string) {
    await this.ensureUserDirectory(userName);
    return path.join(this.userDirectory(userName), "gallery");
  }

  public async ensureDownloadDirectory(userName: string, destination: DownloadDestination) {
    return destination === "gallery" ? this.ensureGalleryDirectory(userName) : this.ensureLocalTubeDirectory(userName);
  }

  public aria2DownloadDirectory(userName: string, destination: DownloadDestination) {
    const root = process.env.ARIA2_DOWNLOAD_ROOT?.trim();
    if (!root) throw new Error("ARIA2_DOWNLOAD_ROOT no está configurado.");
    return path.join(root, userName, destination === "gallery" ? "gallery" : "local-tube");
  }

  public async createUserDirectory(userName: string) {
    await mkdir(this.root, { recursive: true, mode: 0o750 });
    try {
      await mkdir(this.userDirectory(userName), { mode: 0o750 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new ConflictException("Ya existe una carpeta para ese usuario.");
      throw error;
    }
    try {
      await Promise.all(
        APPLICATION_DIRECTORIES.map((application) =>
          mkdir(path.join(this.userDirectory(userName), application), { mode: 0o750 }),
        ),
      );
    } catch (error) {
      await this.cleanupCreatedUserDirectory(userName);
      throw error;
    }
    return true;
  }

  public async cleanupCreatedUserDirectory(userName: string) {
    const directory = this.userDirectory(userName);
    const entries = await readdir(directory).catch(() => [] as string[]);
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith("profile-"))
        .map((entry) => unlink(path.join(directory, entry)).catch(() => undefined)),
    );
    await Promise.all(
      APPLICATION_DIRECTORIES.map((application) => rmdir(path.join(directory, application)).catch(() => undefined)),
    );
    await rmdir(directory).catch(() => undefined);
  }

  public async renameUserDirectory(oldName: string, newName: string) {
    if (oldName === newName) return this.ensureUserDirectory(newName);
    await mkdir(this.root, { recursive: true, mode: 0o750 });
    try {
      await rename(this.userDirectory(oldName), this.userDirectory(newName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return this.ensureUserDirectory(newName);
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new ConflictException("Ya existe una carpeta para ese usuario.");
      throw error;
    }
  }

  public async savePhoto(userName: string, userId: string, upload: PhotoUpload) {
    const extension = PHOTO_TYPES.get(upload.mimetype);
    if (!extension) throw new UnsupportedMediaTypeException("La foto debe ser JPG, PNG o WebP.");
    if (upload.buffer.byteLength > MAX_PHOTO_BYTES)
      throw new PayloadTooLargeException("La foto no puede superar 5 MB.");
    await this.ensureUserDirectory(userName);
    const filename = `profile-${userId}-${randomUUID()}${extension}`;
    await writeFile(path.join(this.userDirectory(userName), filename), upload.buffer, { mode: 0o640 });
    return filename;
  }

  public async removePhoto(userName: string, filename: string | null | undefined) {
    if (!filename) return;
    await unlink(this.photoPath(userName, filename)).catch(() => undefined);
  }

  public async openPhoto(userName: string, filename: string) {
    const photoPath = this.photoPath(userName, filename);
    try {
      await access(photoPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new NotFoundException("Foto no encontrada.");
      throw error;
    }
    const extension = path.extname(filename).toLowerCase();
    const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    return { stream: createReadStream(photoPath), contentType };
  }

  private userDirectory(userName: string) {
    return path.join(this.root, userName);
  }

  private resolveRoot(configuredPath: string) {
    if (path.isAbsolute(configuredPath)) return path.resolve(configuredPath);
    const workingDirectory = process.cwd();
    const isApiPackageDirectory =
      path.basename(workingDirectory) === "api" && path.basename(path.dirname(workingDirectory)) === "apps";
    return path.resolve(
      isApiPackageDirectory ? path.resolve(workingDirectory, "../..") : workingDirectory,
      configuredPath,
    );
  }

  private photoPath(userName: string, filename: string) {
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || !filename.startsWith("profile-"))
      throw new NotFoundException("Foto no encontrada.");
    return path.join(this.userDirectory(userName), safeFilename);
  }
}
