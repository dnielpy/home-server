"use server";

import { RestFactory } from "@home-server/core/http";
import type { Result } from "@home-server/core/types";
import { downloadsResponseSchema, type DownloadsResponse } from "@home-server/contracts/downloads";
import { API_ROUTES } from "@/src/routes";

const downloadsCommand = RestFactory.createGet<DownloadsResponse>(API_ROUTES.downloads, {
  cache: "no-store",
  parse: downloadsResponseSchema.parse,
});

export const getDownloads = async (): Promise<Result<DownloadsResponse>> => downloadsCommand.execute();
