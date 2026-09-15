import Link from "next/link";
import type { LocalTubeVideo } from "@home-server/contracts/localtube";
import { localTubeUrls } from "@/src/modules/localtube/utils/urls";
import { VideoThumbnail } from "./video-thumbnail";

function displayTitle(title: string) {
  return title
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export const VideoCard = ({ video, compact = false }: { video: LocalTubeVideo; compact?: boolean }) => {
  const title = displayTitle(video.title);
  return (
    <Link
      href={`/localtube/watch/${video.id}`}
      className="group focus-visible:ring-ring/60 block min-w-0 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <article className={compact ? "flex min-w-0 gap-3" : undefined}>
        <div
          className={
            compact
              ? "bg-muted relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg shadow-sm"
              : "bg-muted relative aspect-video overflow-hidden rounded-lg shadow-sm"
          }
        >
          <VideoThumbnail
            alt={title}
            src={localTubeUrls.thumbnail(video.id)}
            sizes={compact ? "144px" : "(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw"}
          />
          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/85 px-1.5 py-px text-[11px] leading-4 font-bold text-white">
            {video.duration}
          </span>
        </div>
        <div className={compact ? "min-w-0 pt-0.5" : "pt-2"}>
          <h2 className="text-card-foreground line-clamp-2 text-sm leading-[1.3] font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-4">
            {video.folder} <span aria-hidden="true">•</span> {formatDate(video.modifiedAt)}
          </p>
        </div>
      </article>
    </Link>
  );
};
