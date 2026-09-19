import { ConflictException, ForbiddenException, Injectable, PayloadTooLargeException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { FastSession } from "@home-server/contracts/fast";
import type { UserRecord } from "../auth/auth.types";

const SESSION_TTL_MS = 60_000;
const MAX_ACTIVE_SESSIONS = 2;
const DOWNLOAD_SIZE_BYTES = 16 * 1024 * 1024;
const MAX_UPLOAD_SIZE_BYTES = 64 * 1024 * 1024;
const CHUNK = Buffer.allocUnsafe(256 * 1024).fill(0xa5);

type SessionRecord = FastSession & {
  userId: string;
};

@Injectable()
export class FastService {
  private readonly sessions = new Map<string, SessionRecord>();

  public createSession(user: UserRecord): FastSession {
    this.pruneExpiredSessions();
    if (this.sessions.size >= MAX_ACTIVE_SESSIONS) {
      throw new ConflictException("El servidor ya está realizando el máximo de pruebas simultáneas.");
    }

    const session: SessionRecord = {
      id: randomUUID(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      userId: user.id,
    };
    this.sessions.set(session.id, session);
    return { id: session.id, expiresAt: session.expiresAt };
  }

  public releaseSession(user: UserRecord, sessionId: string) {
    this.requireSession(user, sessionId);
    this.sessions.delete(sessionId);
  }

  public ping(user: UserRecord, sessionId: string) {
    this.requireSession(user, sessionId);
  }

  public createDownload(user: UserRecord, sessionId: string) {
    this.requireSession(user, sessionId);
    let remaining = DOWNLOAD_SIZE_BYTES;
    const stream = new Readable({
      read() {
        while (remaining > 0) {
          const chunk = remaining >= CHUNK.length ? CHUNK : CHUNK.subarray(0, remaining);
          remaining -= chunk.length;
          if (!this.push(chunk)) return;
        }
        this.push(null);
      },
    });
    return { stream, size: DOWNLOAD_SIZE_BYTES };
  }

  public async consumeUpload(user: UserRecord, sessionId: string, body: unknown) {
    this.requireSession(user, sessionId);
    if (!body || typeof body !== "object" || !(Symbol.asyncIterator in body)) {
      throw new PayloadTooLargeException("La subida debe ser un flujo binario.");
    }

    let bytes = 0;
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array>) {
      bytes += chunk.byteLength;
      if (bytes > MAX_UPLOAD_SIZE_BYTES) {
        throw new PayloadTooLargeException("Cada flujo de subida está limitado a 64 MB.");
      }
    }
    return bytes;
  }

  private requireSession(user: UserRecord, sessionId: string) {
    this.pruneExpiredSessions();
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== user.id) throw new ForbiddenException("La sesión de prueba no es válida.");
    return session;
  }

  private pruneExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (Date.parse(session.expiresAt) <= now) this.sessions.delete(id);
    }
  }
}
