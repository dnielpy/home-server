import { Inject, Injectable, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, users } from "@home-server/database";
import { AuthService, hashPassword, toUserDto, validatePassword, validateUserName } from "../auth/auth.service";
import type { UserDto } from "@home-server/contracts";
import { UserStorageService, type PhotoUpload } from "../storage/user-storage.service";
import { DownloadsService } from "../downloads/downloads.service";

export type UpdateUserInput = {
  name: string;
  password?: string;
  photo?: PhotoUpload;
  removePhoto?: boolean;
};

@Injectable()
export class UsersService {
  public constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(UserStorageService)
    private readonly userStorage: UserStorageService,
    @Inject(DownloadsService)
    private readonly downloads: DownloadsService,
  ) {}

  public async list(): Promise<UserDto[]> {
    const records = await db
      .select()
      .from(users)
      .orderBy(sql`${users.isAdmin} desc`, asc(users.name));
    return records.map(toUserDto);
  }

  public async create(name: string, password: string, photo?: PhotoUpload) {
    const normalizedName = validateUserName(name);
    validatePassword(password);
    await this.assertNameAvailable(normalizedName);
    const credentials = await hashPassword(password);
    const [record] = await db
      .insert(users)
      .values({ name: normalizedName, ...credentials, isAdmin: false })
      .returning();
    if (!record) throw new Error("No se pudo crear el usuario.");

    let createdDirectory = false;
    try {
      createdDirectory = await this.userStorage.createUserDirectory(record.name);
      if (photo) {
        const photoPath = await this.userStorage.savePhoto(record.name, record.id, photo);
        const [updated] = await db
          .update(users)
          .set({ photoPath, updatedAt: new Date() })
          .where(eq(users.id, record.id))
          .returning();
        return toUserDto(updated ?? { ...record, photoPath });
      }
      return toUserDto(record);
    } catch (error) {
      await db.delete(users).where(eq(users.id, record.id));
      if (createdDirectory) await this.userStorage.cleanupCreatedUserDirectory(record.name);
      throw error;
    }
  }

  public async update(id: string, input: UpdateUserInput) {
    const current = await this.authService.findById(id);
    if (!current) throw new NotFoundException("Usuario no encontrado.");
    const name = validateUserName(input.name);
    await this.assertNameAvailable(name, id);

    let nextPhotoPath = current.photoPath;
    let newPhotoPath: string | null = null;
    const renamed = current.name !== name;
    if (renamed) {
      await this.downloads.assertUserCanChangeStorage(id);
      await this.userStorage.renameUserDirectory(current.name, name);
    }

    const credentials = input.password
      ? await (async () => {
          validatePassword(input.password!);
          return hashPassword(input.password!);
        })()
      : undefined;

    try {
      if (input.photo) {
        newPhotoPath = await this.userStorage.savePhoto(name, id, input.photo);
        nextPhotoPath = newPhotoPath;
      } else if (input.removePhoto) {
        nextPhotoPath = null;
      }
      const [updated] = await db
        .update(users)
        .set({
          name,
          photoPath: nextPhotoPath,
          ...(credentials ?? {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      if (!updated) throw new NotFoundException("Usuario no encontrado.");
      if (credentials) await this.authService.deleteUserSessions(id);
      if (current.photoPath && current.photoPath !== nextPhotoPath)
        await this.userStorage.removePhoto(name, current.photoPath);
      return toUserDto(updated);
    } catch (error) {
      if (newPhotoPath) await this.userStorage.removePhoto(name, newPhotoPath);
      if (renamed) await this.userStorage.renameUserDirectory(name, current.name).catch(() => undefined);
      throw error;
    }
  }

  public async remove(id: string) {
    const current = await this.authService.findById(id);
    if (!current) throw new NotFoundException("Usuario no encontrado.");
    if (current.isAdmin) throw new ForbiddenException("El administrador no puede eliminarse.");
    await this.downloads.assertUserCanChangeStorage(id);
    await db.delete(users).where(eq(users.id, id));
    await this.userStorage.removePhoto(current.name, current.photoPath);
    return toUserDto(current);
  }

  public async photo(id: string) {
    const current = await this.authService.findById(id);
    if (!current || !current.photoPath) throw new NotFoundException("Foto no encontrada.");
    return await this.userStorage.openPhoto(current.name, current.photoPath);
  }

  private async assertNameAvailable(name: string, ignoredId?: string) {
    const [match] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(sql`lower(${users.name})`, name.toLocaleLowerCase("en-US")),
          ignoredId ? ne(users.id, ignoredId) : undefined,
        ),
      )
      .limit(1);
    if (match) throw new ConflictException("Ya existe un usuario con ese nombre.");
  }
}
