import { Injectable } from "@nestjs/common";
import { db, networkTotals, stats } from "@home-server/database";
import type { NetworkHistoryPoint, SystemMetrics } from "@home-server/contracts/stats";
import { desc, eq, gte, lt, sql } from "drizzle-orm";

const NETWORK_TOTALS_ROW_ID = 1;
const toNumber = (value: number | null) => value ?? 0;

@Injectable()
export class StatsRepository {
  public async persist(metrics: SystemMetrics) {
    await db.transaction(async (tx) => {
      const [previousTotals] = await tx
        .select()
        .from(networkTotals)
        .where(eq(networkTotals.id, NETWORK_TOTALS_ROW_ID))
        .limit(1);

      const sameInterface = previousTotals?.interfaceName === metrics.network.interfaceName;
      const receivedDelta =
        previousTotals && sameInterface && metrics.network.receivedBytes >= previousTotals.lastReceivedBytes
          ? metrics.network.receivedBytes - previousTotals.lastReceivedBytes
          : 0;
      const transmittedDelta =
        previousTotals && sameInterface && metrics.network.transmittedBytes >= previousTotals.lastTransmittedBytes
          ? metrics.network.transmittedBytes - previousTotals.lastTransmittedBytes
          : 0;
      const totalReceivedBytes = (previousTotals?.totalReceivedBytes ?? 0) + receivedDelta;
      const totalTransmittedBytes = (previousTotals?.totalTransmittedBytes ?? 0) + transmittedDelta;

      if (previousTotals) {
        await tx
          .update(networkTotals)
          .set({
            interfaceName: metrics.network.interfaceName,
            lastReceivedBytes: metrics.network.receivedBytes,
            lastTransmittedBytes: metrics.network.transmittedBytes,
            totalReceivedBytes,
            totalTransmittedBytes,
            updatedAt: new Date(metrics.updatedAt),
          })
          .where(eq(networkTotals.id, NETWORK_TOTALS_ROW_ID));
      } else {
        await tx.insert(networkTotals).values({
          id: NETWORK_TOTALS_ROW_ID,
          interfaceName: metrics.network.interfaceName,
          lastReceivedBytes: metrics.network.receivedBytes,
          lastTransmittedBytes: metrics.network.transmittedBytes,
          totalReceivedBytes: metrics.network.receivedBytes,
          totalTransmittedBytes: metrics.network.transmittedBytes,
          updatedAt: new Date(metrics.updatedAt),
        });
      }

      await tx.insert(stats).values({
        recordedAt: new Date(metrics.updatedAt),
        cpuUsed: metrics.cpu.used ?? 0,
        cpuIdle: metrics.cpu.idle ?? 0,
        memoryTotal: metrics.memory.total,
        memoryUsed: metrics.memory.used,
        memoryAvailable: metrics.memory.available,
        memoryPercentUsed: metrics.memory.percentUsed,
        systemStorageMount: metrics.systemStorage?.mount,
        systemStorageTotal: metrics.systemStorage?.total,
        systemStorageUsed: metrics.systemStorage?.used,
        systemStorageAvailable: metrics.systemStorage?.available,
        systemStoragePercentUsed: metrics.systemStorage?.percentUsed,
        externalStorageMount: metrics.externalStorage?.mount,
        externalStorageTotal: metrics.externalStorage?.total,
        externalStorageUsed: metrics.externalStorage?.used,
        externalStorageAvailable: metrics.externalStorage?.available,
        externalStoragePercentUsed: metrics.externalStorage?.percentUsed,
        networkInterfaceName: metrics.network.interfaceName,
        networkReceivedBytes: totalReceivedBytes,
        networkTransmittedBytes: totalTransmittedBytes,
        networkReceiveRate: metrics.network.receiveRate,
        networkTransmitRate: metrics.network.transmitRate,
      });
    });
  }

  public async findLatest(): Promise<SystemMetrics | null> {
    const [row] = await db.select().from(stats).orderBy(desc(stats.recordedAt)).limit(1);
    if (!row) return null;

    return {
      updatedAt: row.recordedAt.toISOString(),
      cpu: { used: row.cpuUsed, idle: row.cpuIdle },
      memory: {
        total: row.memoryTotal,
        used: row.memoryUsed,
        available: row.memoryAvailable,
        percentUsed: row.memoryPercentUsed,
      },
      systemStorage: row.systemStorageMount
        ? {
            mount: row.systemStorageMount,
            total: toNumber(row.systemStorageTotal),
            used: toNumber(row.systemStorageUsed),
            available: toNumber(row.systemStorageAvailable),
            percentUsed: toNumber(row.systemStoragePercentUsed),
          }
        : null,
      externalStorage: row.externalStorageMount
        ? {
            mount: row.externalStorageMount,
            total: toNumber(row.externalStorageTotal),
            used: toNumber(row.externalStorageUsed),
            available: toNumber(row.externalStorageAvailable),
            percentUsed: toNumber(row.externalStoragePercentUsed),
          }
        : null,
      network: {
        interfaceName: row.networkInterfaceName,
        receivedBytes: row.networkReceivedBytes,
        transmittedBytes: row.networkTransmittedBytes,
        receiveRate: row.networkReceiveRate,
        transmitRate: row.networkTransmitRate,
      },
    };
  }

  public async findNetworkHistory(from: Date): Promise<NetworkHistoryPoint[]> {
    const rows = await db
      .select({
        timestamp: stats.recordedAt,
        received: stats.networkReceiveRate,
        transmitted: stats.networkTransmitRate,
      })
      .from(stats)
      .where(gte(stats.recordedAt, from))
      .orderBy(stats.recordedAt);

    return rows.map((row) => ({
      timestamp: row.timestamp.toISOString(),
      received: row.received,
      transmitted: row.transmitted,
    }));
  }

  public async findWeeklyNetworkHistory(from: Date): Promise<NetworkHistoryPoint[]> {
    const bucket = sql<Date>`date_bin('15 minutes', ${stats.recordedAt}, TIMESTAMPTZ '2000-01-01 00:00:00+00')`;
    const rows = await db
      .select({
        timestamp: bucket,
        received: sql<number | null>`avg(${stats.networkReceiveRate})`,
        transmitted: sql<number | null>`avg(${stats.networkTransmitRate})`,
      })
      .from(stats)
      .where(gte(stats.recordedAt, from))
      .groupBy(bucket)
      .orderBy(bucket);

    return rows.map((row) => ({
      // PostgreSQL returns the result of the raw date_bin expression as a string.
      // Convert it explicitly instead of relying on the TypeScript `sql<Date>` hint.
      timestamp: new Date(row.timestamp).toISOString(),
      received: row.received === null ? null : Number(row.received),
      transmitted: row.transmitted === null ? null : Number(row.transmitted),
    }));
  }

  public async deleteBefore(timestamp: Date) {
    await db.delete(stats).where(lt(stats.recordedAt, timestamp));
  }
}
