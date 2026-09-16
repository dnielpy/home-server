"use server";

import type { Result } from "@home-server/core/types";
import {
  networkHistoryResponseSchema,
  statsLiveResponseSchema,
  type NetworkHistoryResponse,
  type StatsLiveResponse,
} from "@home-server/contracts/stats";
import { API_ROUTES } from "@/src/routes";
import { authenticatedApiRequest } from "@/src/modules/auth/server/session";

export const getLiveStats = async (): Promise<Result<StatsLiveResponse>> =>
  authenticatedApiRequest(API_ROUTES.stats.live, statsLiveResponseSchema.parse, { cache: "no-store" });

export const getWeeklyNetworkHistory = async (): Promise<Result<NetworkHistoryResponse>> =>
  authenticatedApiRequest(API_ROUTES.stats.networkHistory, networkHistoryResponseSchema.parse, { cache: "no-store" });
