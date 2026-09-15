import { z } from "zod";

export const galleryMediaKindSchema = z.enum(["image", "video"]);

export const galleryMediaSchema = z.object({
  id: z.string().length(32),
  kind: galleryMediaKindSchema,
  fileName: z.string(),
  mimeType: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  modifiedAt: z.string().datetime(),
  size: z.number().int().nonnegative(),
  durationSeconds: z.number().nonnegative().nullable(),
});

export const galleryMediaPageSchema = z.object({
  items: z.array(galleryMediaSchema),
  nextCursor: z.string().nullable(),
});

export const galleryAlbumSchema = z.object({ id: z.string().length(32), name: z.string() });
export const galleryAlbumSummarySchema = galleryAlbumSchema.extend({
  itemCount: z.number().int().nonnegative(),
  cover: galleryMediaSchema.nullable(),
});
export const galleryAlbumsResponseSchema = z.object({ albums: z.array(galleryAlbumSummarySchema) });

export const galleryUploadResultSchema = z.object({
  fileName: z.string(),
  folderName: z.string().nullable(),
  size: z.number().int().nonnegative(),
});

export type GalleryMedia = z.infer<typeof galleryMediaSchema>;
export type GalleryMediaPage = z.infer<typeof galleryMediaPageSchema>;
export type GalleryAlbum = z.infer<typeof galleryAlbumSchema>;
export type GalleryAlbumSummary = z.infer<typeof galleryAlbumSummarySchema>;
export type GalleryUploadResult = z.infer<typeof galleryUploadResultSchema>;
