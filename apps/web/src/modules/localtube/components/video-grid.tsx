import type { LocalTubeVideo } from "@home-server/contracts/localtube";
import { VideoCard } from "./video-card";

export const VideoGrid = ({ videos }: { videos: LocalTubeVideo[] }) => {
  return (
    <div className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};
