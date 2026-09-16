"use server";

import type { Result } from "@home-server/core/types";
import { downloadsResponseSchema, type DownloadsResponse } from "@home-server/contracts/downloads";
import { API_ROUTES } from "@/src/routes";
import { authenticatedApiRequest } from "@/src/modules/auth/server/session";

export const getDownloads = async (): Promise<Result<DownloadsResponse>> =>
  authenticatedApiRequest(API_ROUTES.downloads, downloadsResponseSchema.parse, { cache: "no-store" });
