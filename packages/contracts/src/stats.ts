import { z } from "zod";

export const cpuMetricSchema = z.object({
  used: z.number().nullable(),
  idle: z.number().nullable(),
});

export const memoryMetricSchema = z.object({
  total: z.number(),
  used: z.number(),
  available: z.number(),
  percentUsed: z.number(),
});

export const storageMetricSchema = z.object({
  mount: z.string(),
  total: z.number(),
  used: z.number(),
  available: z.number(),
  percentUsed: z.number(),
});

export const networkMetricSchema = z.object({
  interfaceName: z.string().nullable(),
  receivedBytes: z.number(),
  transmittedBytes: z.number(),
  receiveRate: z.number().nullable(),
  transmitRate: z.number().nullable(),
});

export const systemMetricsSchema = z.object({
  updatedAt: z.string().datetime(),
  cpu: cpuMetricSchema,
  memory: memoryMetricSchema,
  systemStorage: storageMetricSchema.nullable(),
  externalStorage: storageMetricSchema.nullable(),
  network: networkMetricSchema,
});

export const networkHistoryPointSchema = z.object({
  timestamp: z.string().datetime(),
  received: z.number().nullable(),
  transmitted: z.number().nullable(),
});

export const statsLiveResponseSchema = z.object({
  current: systemMetricsSchema,
  networkHistory: z.array(networkHistoryPointSchema),
});

export const networkHistoryResponseSchema = z.object({
  period: z.literal("7d"),
  intervalMinutes: z.literal(15),
  points: z.array(networkHistoryPointSchema),
});

export type SystemMetrics = z.infer<typeof systemMetricsSchema>;
export type NetworkHistoryPoint = z.infer<typeof networkHistoryPointSchema>;
export type StatsLiveResponse = z.infer<typeof statsLiveResponseSchema>;
export type NetworkHistoryResponse = z.infer<typeof networkHistoryResponseSchema>;
