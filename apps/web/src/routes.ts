const STATS_V1 = "/v1/stats";
const LOCALTUBE_V1 = "/v1/localtube";
const GALLERY_V1 = "/v1/gallery";
const DOWNLOADS_V1 = "/v1/downloads";
const FAST_V1 = "/v1/fast";

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
  gallery: {
    media: `${GALLERY_V1}/media`,
    albums: `${GALLERY_V1}/albums`,
    uploads: `${GALLERY_V1}/uploads`,
  },
  downloads: DOWNLOADS_V1,
  fast: {
    sessions: `${FAST_V1}/sessions`,
    ping: `${FAST_V1}/ping`,
    download: `${FAST_V1}/download`,
    upload: `${FAST_V1}/upload`,
  },
} as const;
