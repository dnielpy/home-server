"use server";

import type { Result } from "@home-server/core/types";
import {
  localTubeVideoPageSchema,
  localTubeVideoSchema,
  type LocalTubeVideo,
  type LocalTubeVideoPage,
} from "@home-server/contracts/localtube";
import { API_ROUTES } from "@/src/routes";
import { authenticatedApiRequest } from "@/src/modules/auth/server/session";

export async function getLocalTubeVideos(
  query = "",
  cursor?: string,
  excludeId?: string,
): Promise<Result<LocalTubeVideoPage>> {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (cursor) search.set("cursor", cursor);
  if (excludeId) search.set("excludeId", excludeId);
  search.set("limit", "12");
  return authenticatedApiRequest(`${API_ROUTES.localTube.videos}?${search.toString()}`, localTubeVideoPageSchema.parse, {
    cache: "no-store",
  });
}

export const getLocalTubeVideo = async (videoId: string): Promise<Result<LocalTubeVideo>> => {
  return authenticatedApiRequest(
    `${API_ROUTES.localTube.videos}/${encodeURIComponent(videoId)}`,
    localTubeVideoSchema.parse,
    {
    cache: "no-store",
    },
  );
};
