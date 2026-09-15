const STATS_V1 = "/v1/stats";
const LOCALTUBE_V1 = "/v1/localtube";

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
  localTube: {
    videos: `${LOCALTUBE_V1}/videos`,
    suggestions: `${LOCALTUBE_V1}/videos/suggestions`,
  },
} as const;
