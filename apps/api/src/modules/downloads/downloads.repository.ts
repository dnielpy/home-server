import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, downloadAttempts, downloads } from "@home-server/database";
import type { DownloadDestination, DownloadStatus } from "@home-server/contracts/downloads";

export type DownloadRow = typeof downloads.$inferSelect;
export type DownloadAttemptRow = typeof downloadAttempts.$inferSelect;

export class DownloadsRepository {
  public async list(userId: string) {
    const rows = await db
      .select()
      .from(downloads)
      .where(eq(downloads.userId, userId))
      .orderBy(desc(downloads.createdAt));
    const attempts = rows.length
      ? await db
          .select()
          .from(downloadAttempts)
          .where(
            inArray(
              downloadAttempts.downloadId,
              rows.map((row) => row.id),
            ),
          )
          .orderBy(asc(downloadAttempts.startedAt))
      : [];
    const byDownload = new Map<string, DownloadAttemptRow[]>();
    for (const attempt of attempts)
      byDownload.set(attempt.downloadId, [...(byDownload.get(attempt.downloadId) ?? []), attempt]);
    return rows.map((row) => ({ row, attempts: byDownload.get(row.id) ?? [] }));
  }

  public async findOwned(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(downloads)
      .where(and(eq(downloads.userId, userId), eq(downloads.id, id)))
      .limit(1);
    if (!row) return null;
    const attempts = await db
      .select()
      .from(downloadAttempts)
      .where(eq(downloadAttempts.downloadId, row.id))
      .orderBy(asc(downloadAttempts.startedAt));
    return { row, attempts };
  }

  public async hasActive(userId: string) {
    const rows = await db.select({ status: downloads.status }).from(downloads).where(eq(downloads.userId, userId));
    return rows.some((row) => row.status === "active" || row.status === "waiting" || row.status === "paused");
  }

  public async create(input: {
    userId: string;
    gid: string;
    url: string;
    destination: DownloadDestination;
    fileName: string;
    now: Date;
  }) {
    const [row] = await db
      .insert(downloads)
      .values({
        userId: input.userId,
        gid: input.gid,
        url: input.url,
        destination: input.destination,
        fileName: input.fileName,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    await db
      .insert(downloadAttempts)
      .values({ downloadId: row!.id, gid: input.gid, status: "waiting", startedAt: input.now });
    return this.findOwned(input.userId, row!.id);
  }

  public async updateOwned(
    userId: string,
    id: string,
    patch: Partial<
      Pick<
        DownloadRow,
        "gid" | "fileName" | "totalBytes" | "completedBytes" | "status" | "libraryStatus" | "errorMessage" | "updatedAt"
      >
    >,
  ) {
    await db
      .update(downloads)
      .set(patch)
      .where(and(eq(downloads.userId, userId), eq(downloads.id, id)));
    return this.findOwned(userId, id);
  }

  public async updateAttempt(
    gid: string,
    status: DownloadStatus,
    errorMessage: string | null,
    finishedAt: Date | null,
  ) {
    await db.update(downloadAttempts).set({ status, errorMessage, finishedAt }).where(eq(downloadAttempts.gid, gid));
  }

  public async appendAttempt(userId: string, id: string, input: { gid: string; now: Date }) {
    const owned = await this.findOwned(userId, id);
    if (!owned) return null;
    await db
      .insert(downloadAttempts)
      .values({ downloadId: id, gid: input.gid, status: "waiting", startedAt: input.now });
    return this.findOwned(userId, id);
  }
}
