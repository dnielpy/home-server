"use client";

import { Download, PlayCircle } from "lucide-react";
import type { LocalTubeVideo } from "@home-server/contracts/localtube";
import { useEffect, useRef } from "react";
import { usePersistentPlayer } from "@/src/modules/localtube/contexts/persistent-player-context";
import { localTubeUrls } from "@/src/modules/localtube/utils/urls";

export const VideoPlayer = ({ video, mini = false }: { video: LocalTubeVideo; mini?: boolean }) => {
  const { activeVideo, playback, setActiveVideo, setPlayback } = usePersistentPlayer();
  const player = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = player.current;
    if (!element || activeVideo?.id !== video.id) return;
    const restore = () => {
      if (playback.currentTime > 0) element.currentTime = playback.currentTime;
      if (playback.isPlaying) void element.play().catch(() => undefined);
    };
    element.addEventListener("loadedmetadata", restore, { once: true });
    return () => element.removeEventListener("loadedmetadata", restore);
  }, [activeVideo?.id, playback.currentTime, playback.isPlaying, video.id]);
  const persist = (isPlaying: boolean) => setPlayback({ currentTime: player.current?.currentTime ?? 0, isPlaying });
  return (
    <div className="border-border overflow-hidden rounded-xl border bg-black shadow-sm">
      <video
        ref={player}
        controls
        playsInline
        onPlay={() => {
          setActiveVideo(video);
          persist(true);
        }}
        onPause={() => persist(false)}
        onTimeUpdate={() => persist(!player.current?.paused)}
        src={localTubeUrls.stream(video.id)}
        className={mini ? "aspect-video w-full" : "aspect-video max-h-[calc(100vh-13rem)] w-full bg-black"}
      >
        Tu navegador no puede reproducir este vídeo.
      </video>
      {!mini && (
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black px-3 py-2 text-white">
          <span className="inline-flex min-w-0 items-center gap-2 truncate text-xs">
            <PlayCircle className="size-3.5" />
            {video.title}
          </span>
          <a
            href={localTubeUrls.stream(video.id, true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
          >
            <Download className="size-3.5" /> Descargar
          </a>
        </div>
      )}
    </div>
  );
};
