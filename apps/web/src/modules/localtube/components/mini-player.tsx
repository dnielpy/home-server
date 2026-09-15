"use client";

import { Expand, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersistentPlayer } from "@/src/modules/localtube/contexts/persistent-player-context";
import { VideoPlayer } from "./video-player";

export const MiniPlayer = () => {
  const pathname = usePathname();
  const { activeVideo, clearPlayer } = usePersistentPlayer();
  if (!activeVideo || pathname.startsWith("/localtube/watch/")) return null;
  return (
    <aside
      aria-label="Mini reproductor LocalTube"
      className="border-border bg-card fixed right-4 bottom-20 z-40 hidden w-80 overflow-hidden rounded-xl border shadow-2xl lg:block"
    >
      <VideoPlayer mini video={activeVideo} />
      <div className="absolute top-2 right-2 flex gap-1">
        <Link
          href={`/localtube/watch/${activeVideo.id}`}
          aria-label="Abrir reproductor"
          className="grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
        >
          <Expand className="size-4" />
        </Link>
        <button
          type="button"
          aria-label="Cerrar mini reproductor"
          onClick={clearPlayer}
          className="grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
};
