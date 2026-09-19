import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import type { UserRecord } from "../auth/auth.types";
import { FastService } from "./fast.service";

const user = (id: string) => ({ id }) as UserRecord;

describe("FastService", () => {
  it("limita el servidor a dos sesiones activas", () => {
    const service = new FastService();
    service.createSession(user("one"));
    service.createSession(user("two"));

    expect(() => service.createSession(user("three"))).toThrow(ConflictException);
  });

  it("no permite usar ni liberar una sesión de otro usuario", () => {
    const service = new FastService();
    const session = service.createSession(user("owner"));

    expect(() => service.ping(user("intruder"), session.id)).toThrow(ForbiddenException);
    expect(() => service.releaseSession(user("intruder"), session.id)).toThrow(ForbiddenException);
  });

  it("genera una descarga finita y consume la subida sin guardarla", async () => {
    const service = new FastService();
    const account = user("owner");
    const session = service.createSession(account);
    const download = service.createDownload(account, session.id);
    let received = 0;
    for await (const chunk of download.stream) received += chunk.length;

    await expect(service.consumeUpload(account, session.id, Readable.from([Buffer.alloc(32)]))).resolves.toBe(32);
    expect(received).toBe(download.size);
  });
});
