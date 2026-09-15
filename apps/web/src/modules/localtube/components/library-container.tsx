import { getLocalTubeVideos } from "@/src/lib/services/localtube";
import { VideoListView } from "./video-list-view";

export const LibraryContainer = async ({ query }: { query: string }) => {
  const result = await getLocalTubeVideos(query);
  return (
    <VideoListView
      query={query}
      initialVideos={result.success ? result.data.items : []}
      initialCursor={result.success ? result.data.nextCursor : null}
      error={result.success ? undefined : result.error.message}
    />
  );
};
