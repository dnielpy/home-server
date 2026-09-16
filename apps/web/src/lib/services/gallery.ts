"use server";

import type { Result } from "@home-server/core/types";
import {
  galleryAlbumsResponseSchema,
  galleryMediaPageSchema,
  type GalleryAlbumSummary,
  type GalleryMediaPage,
} from "@home-server/contracts/gallery";
import { API_ROUTES } from "@/src/routes";
import { authenticatedApiRequest } from "@/src/modules/auth/server/session";

export const getGalleryMedia = async (
  albumId?: string,
  cursor?: string,
  limit = 60,
): Promise<Result<GalleryMediaPage>> => {
  const query = new URLSearchParams();
  if (albumId) query.set("albumId", albumId);
  if (cursor) query.set("cursor", cursor);
  query.set("limit", String(limit));
  return authenticatedApiRequest(`${API_ROUTES.gallery.media}?${query.toString()}`, galleryMediaPageSchema.parse, {
    cache: "no-store",
  });
};

export const getGalleryAlbums = async (): Promise<Result<GalleryAlbumSummary[]>> => {
  const result = await authenticatedApiRequest(API_ROUTES.gallery.albums, galleryAlbumsResponseSchema.parse, {
    cache: "no-store",
  });
  return result.success ? { success: true, data: result.data.albums } : result;
};
