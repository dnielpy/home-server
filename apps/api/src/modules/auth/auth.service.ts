import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, sessions, users } from "@home-server/database";
import type { LoginProfile, UserDto } from "@home-server/contracts";
import type { UserRecord } from "./auth.types";
import { UserStorageService } from "../storage/user-storage.service";

const PASSWORD_MIN_LENGTH = 8;
const SESSION_DAYS = 30;
const scryptAsync = promisify(scrypt);

export const normalizeUserName = (value: string) => value.trim().normalize("NFC");
export const normalizeUserNameForLookup = (value: string) => normalizeUserName(value).toLocaleLowerCase("en-US");

export function validateUserName(value: string) {
  const name = normalizeUserName(value);
  if (!name) throw new Error("El nombre de usuario es obligatorio.");
  if (name.length > 80) throw new Error("El nombre de usuario no puede superar 80 caracteres.");
  if (/[\\/\u0000-\u001f\u007f]/.test(name) || name === "." || name === ".." || name.startsWith(".")) throw new Error("El nombre de usuario contiene caracteres no válidos.");
  return name;
}

export function validatePassword(value: string) {
  if (value.length < PASSWORD_MIN_LENGTH) throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  return value;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return { passwordHash: hash.toString("base64url"), passwordSalt: salt };
}

export async function verifyPassword(password: string, record: Pick<UserRecord, "passwordHash" | "passwordSalt">) {
  try {
    const candidate = await scryptAsync(password, record.passwordSalt, 64) as Buffer;
    const expected = Buffer.from(record.passwordHash, "base64url");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    name: user.name,
    photoUrl: user.photoPath ? `/v1/users/${user.id}/photo` : null,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  public constructor(
    @Inject(UserStorageService)
    private readonly userStorage: UserStorageService,
  ) {}

  public async onModuleInit() {
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)).limit(1);
    if (admin) {
      const existingUsers = await db.select({ name: users.name }).from(users);
      await Promise.all(existingUsers.map((user) => this.userStorage.ensureUserDirectory(user.name)));
      return;
    }

    const name = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!name || !password) {
      throw new Error("ADMIN_USERNAME y ADMIN_PASSWORD son obligatorios para crear el administrador inicial.");
    }

    const normalizedName = validateUserName(name);
    validatePassword(password);
    const [existing] = await db.select({ id: users.id }).from(users)
      .where(eq(sql`lower(${users.name})`, normalizeUserNameForLookup(normalizedName))).limit(1);
    if (existing) throw new Error(`No se puede crear el administrador: el usuario '${normalizedName}' ya existe.`);

    const credentials = await hashPassword(password);
    await db.insert(users).values({ name: normalizedName, ...credentials, isAdmin: true });
    const allUsers = await db.select({ name: users.name }).from(users);
    await Promise.all(allUsers.map((user) => this.userStorage.ensureUserDirectory(user.name)));
    this.logger.log(`Administrador inicial '${normalizedName}' creado.`);
  }

  public async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  public async findByName(name: string) {
    const [user] = await db.select().from(users)
      .where(eq(sql`lower(${users.name})`, normalizeUserNameForLookup(name))).limit(1);
    return user ?? null;
  }

  public async listLoginProfiles(): Promise<LoginProfile[]> {
    const records = await db.select().from(users).orderBy(sql`${users.isAdmin} desc`, users.name);
    return records.map((user) => ({
      id: user.id,
      name: user.name,
      photoUrl: user.photoPath ? `/v1/auth/profiles/${user.id}/photo` : null,
    }));
  }

  public async loginProfilePhoto(id: string) {
    const user = await this.findById(id);
    if (!user || !user.photoPath) return null;
    return this.userStorage.openPhoto(user.name, user.photoPath);
  }

  public async createSession(userId: string) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1_000);
    await db.insert(sessions).values({ userId, tokenHash: hashSessionToken(token), expiresAt });
    return token;
  }

  public async getUserForSession(token: string | undefined) {
    if (!token) return null;
    const [result] = await db.select({ user: users }).from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return result?.user ?? null;
  }

  public async deleteSession(token: string | undefined) {
    if (!token) return;
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  public async deleteUserSessions(userId: string) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  public extractToken(request: { headers: { authorization?: string } }) {
    const value = request.headers.authorization;
    if (!value?.startsWith("Bearer ")) return undefined;
    const token = value.slice("Bearer ".length).trim();
    return token || undefined;
  }

  public async login(name: string, password: string) {
    const user = await this.findByName(name);
    if (!user || !(await verifyPassword(password, user))) return null;
    return { user: toUserDto(user), sessionToken: await this.createSession(user.id) };
  }
}
