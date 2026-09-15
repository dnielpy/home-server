"use server";

import { RestFactory } from "@home-server/core/http";
import type { Result } from "@home-server/core/types";
import {
  galleryAlbumsResponseSchema,
  galleryMediaPageSchema,
  type GalleryAlbumSummary,
  type GalleryMediaPage,
} from "@home-server/contracts/gallery";
import { API_ROUTES } from "@/src/routes";

type MediaQuery = { cursor?: string; limit?: number; albumId?: string };

const mediaCommand = RestFactory.createGet<GalleryMediaPage, MediaQuery>(API_ROUTES.gallery.media, {
  cache: "no-store",
  buildRequest: (query) => ({ query }),
  parse: galleryMediaPageSchema.parse,
});
const albumsCommand = RestFactory.createGet<{ albums: GalleryAlbumSummary[] }>(API_ROUTES.gallery.albums, {
  cache: "no-store",
  parse: galleryAlbumsResponseSchema.parse,
});

export const getGalleryMedia = async (
  albumId?: string,
  cursor?: string,
  limit = 60,
): Promise<Result<GalleryMediaPage>> => mediaCommand.execute({ albumId, cursor, limit });

export const getGalleryAlbums = async (): Promise<Result<GalleryAlbumSummary[]>> => {
  const result = await albumsCommand.execute();
  return result.success ? { success: true, data: result.data.albums } : result;
};
