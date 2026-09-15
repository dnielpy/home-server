"use server";

import { RestFactory } from "@home-server/core/http";
import type { Result } from "@home-server/core/types";
import type { NetworkHistoryResponse, StatsLiveResponse } from "@home-server/contracts/stats";
import { API_ROUTES } from "@/src/routes";

const liveStatsCommand = RestFactory.createGet<StatsLiveResponse>(API_ROUTES.stats.live, { cache: "no-store" });
const weeklyNetworkHistoryCommand = RestFactory.createGet<NetworkHistoryResponse>(API_ROUTES.stats.networkHistory, {
  cache: "no-store",
});

export const getLiveStats = async (): Promise<Result<StatsLiveResponse>> => liveStatsCommand.execute();

export const getWeeklyNetworkHistory = async (): Promise<Result<NetworkHistoryResponse>> =>
  weeklyNetworkHistoryCommand.execute();
