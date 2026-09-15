"use server";

import { RestFactory } from "@home-server/core/http";
import type { Result } from "@home-server/core/types";
import {
  localTubeVideoPageSchema,
  localTubeVideoSchema,
  type LocalTubeVideo,
  type LocalTubeVideoPage,
} from "@home-server/contracts/localtube";
import { API_ROUTES } from "@/src/routes";

type VideosQuery = { q?: string; cursor?: string; limit?: number; excludeId?: string };

const videosCommand = RestFactory.createGet<LocalTubeVideoPage, VideosQuery>(API_ROUTES.localTube.videos, {
  cache: "no-store",
  buildRequest: (query) => ({ query }),
  parse: localTubeVideoPageSchema.parse,
});

export async function getLocalTubeVideos(
  query = "",
  cursor?: string,
  excludeId?: string,
): Promise<Result<LocalTubeVideoPage>> {
  return videosCommand.execute({ q: query || undefined, cursor, limit: 12, excludeId });
}

export const getLocalTubeVideo = async (videoId: string): Promise<Result<LocalTubeVideo>> => {
  const command = RestFactory.createGet(`${API_ROUTES.localTube.videos}/${encodeURIComponent(videoId)}`, {
    cache: "no-store",
    parse: localTubeVideoSchema.parse,
  });
  return command.execute();
};
