const STATS_V1 = "/v1/stats";

export const API_ROUTES = {
  health: "/health",
  stats: {
    base: STATS_V1,
    live: `${STATS_V1}/live`,
    networkHistory: `${STATS_V1}/network-history?period=7d`,
  },
  users: {
    list: "/v1/users",
  },
} as const;
