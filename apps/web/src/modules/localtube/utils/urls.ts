export const localTubeUrls = {
  videos: "/api/localtube/videos",
  suggestions: "/api/localtube/videos/suggestions",
  video: (id: string) => `/api/localtube/videos/${encodeURIComponent(id)}`,
  stream: (id: string, download = false) =>
    `/api/localtube/videos/${encodeURIComponent(id)}/stream${download ? "?download=1" : ""}`,
  thumbnail: (id: string) => `/api/localtube/videos/${encodeURIComponent(id)}/thumbnail`,
  upload: "/api/localtube/uploads",
};
