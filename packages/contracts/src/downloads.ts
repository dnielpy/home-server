import { z } from "zod";

export const downloadStatusSchema = z.enum(["waiting", "active", "paused", "complete", "error", "removed"]);
export const downloadDestinationSchema = z.enum(["gallery", "localtube"]);
export const downloadLibraryStatusSchema = z.enum(["pending", "available", "unsupported"]);

export const downloadAttemptSchema = z.object({
  gid: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: downloadStatusSchema,
  errorMessage: z.string().nullable(),
});

export const downloadSchema = z.object({
  id: z.string().uuid(),
  gid: z.string(),
  url: z.string().url(),
  destination: downloadDestinationSchema,
  fileName: z.string(),
  totalBytes: z.number().int().nonnegative(),
  completedBytes: z.number().int().nonnegative(),
  progress: z.number().min(0).max(100),
  speedBytesPerSecond: z.number().int().nonnegative(),
  etaSeconds: z.number().int().nonnegative().nullable(),
  status: downloadStatusSchema,
  libraryStatus: downloadLibraryStatusSchema,
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  attempts: z.array(downloadAttemptSchema),
});

export const downloadStatsSchema = z.object({
  downloadSpeedBytesPerSecond: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  waiting: z.number().int().nonnegative(),
  stopped: z.number().int().nonnegative(),
});

export const downloadsResponseSchema = z.object({
  downloads: z.array(downloadSchema),
  stats: downloadStatsSchema,
});

export const createDownloadSchema = z.object({
  url: z.unknown(),
  destination: downloadDestinationSchema,
});

export type DownloadStatus = z.infer<typeof downloadStatusSchema>;
export type DownloadDestination = z.infer<typeof downloadDestinationSchema>;
export type DownloadLibraryStatus = z.infer<typeof downloadLibraryStatusSchema>;
export type DownloadAttempt = z.infer<typeof downloadAttemptSchema>;
export type Download = z.infer<typeof downloadSchema>;
export type DownloadStats = z.infer<typeof downloadStatsSchema>;
export type DownloadsResponse = z.infer<typeof downloadsResponseSchema>;
export type DownloadAction = "pause" | "resume" | "retry" | "cancel";
