import { z } from "zod";

export const localTubeVideoSchema = z.object({
  id: z.string().length(32),
  title: z.string(),
  duration: z.string(),
  modifiedAt: z.string().datetime(),
  folder: z.string(),
  size: z.number().int().nonnegative(),
});

export const localTubeVideoPageSchema = z.object({
  items: z.array(localTubeVideoSchema),
  nextCursor: z.string().nullable(),
});

export const localTubeSuggestionsSchema = z.object({ suggestions: z.array(z.string()) });

export const localTubeUploadResultSchema = z.object({
  fileName: z.string(),
  folderName: z.string().nullable(),
  size: z.number().int().nonnegative(),
});

export type LocalTubeVideo = z.infer<typeof localTubeVideoSchema>;
export type LocalTubeVideoPage = z.infer<typeof localTubeVideoPageSchema>;
export type LocalTubeUploadResult = z.infer<typeof localTubeUploadResultSchema>;
