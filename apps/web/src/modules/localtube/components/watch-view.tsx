import type { LocalTubeVideo } from "@home-server/contracts/localtube";
import { VideoCard } from "./video-card";
import { VideoPlayer } from "./video-player";

export const WatchView = ({ video, upNext }: { video: LocalTubeVideo; upNext: LocalTubeVideo[] }) => {
  return (
    <section className="mx-auto max-w-[1440px]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <VideoPlayer video={video} />
          <h1 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">{video.title.replace(/[._-]+/g, " ")}</h1>
          <p className="text-muted-foreground mt-2 text-xs">
            {video.duration} <span aria-hidden="true">•</span> {video.folder}
          </p>
        </div>
        <aside>
          <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">A continuación</h2>
          <div className="grid gap-4">
            {upNext.map((candidate) => (
              <VideoCard key={candidate.id} compact video={candidate} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};
