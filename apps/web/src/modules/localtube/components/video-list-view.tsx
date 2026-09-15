"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalTubeVideo, LocalTubeVideoPage } from "@home-server/contracts/localtube";
import { localTubeUrls } from "@/src/modules/localtube/utils/urls";
import { VideoGrid } from "./video-grid";

export const VideoListView = ({
  initialVideos,
  initialCursor,
  query,
  error,
}: {
  initialVideos: LocalTubeVideo[];
  initialCursor: string | null;
  query: string;
  error?: string;
}) => {
  const [videos, setVideos] = useState(initialVideos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ cursor, limit: "12" });
      if (query) params.set("q", query);
      const response = await fetch(`${localTubeUrls.videos}?${params}`);
      if (!response.ok) throw new Error("No se pudieron cargar más vídeos.");
      const page = (await response.json()) as LocalTubeVideoPage;
      setVideos((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "No se pudieron cargar más vídeos.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, query]);
  useEffect(() => {
    if (!sentinel.current || !cursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, loadMore]);
  if (error)
    return (
      <div className="border-destructive/30 bg-card rounded-xl border p-8 text-center">
        <p className="font-semibold">La biblioteca no está disponible</p>
        <p className="text-muted-foreground mt-2 text-sm">{error}</p>
      </div>
    );
  if (!videos.length)
    return (
      <div className="border-border bg-card rounded-xl border p-8 text-center">
        <p className="font-semibold">
          {query ? "No hay vídeos que coincidan." : "Todavía no hay vídeos en tu biblioteca."}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          {query ? "Prueba con otra búsqueda." : "Sube un MP4 o WebM para empezar."}
        </p>
      </div>
    );
  return (
    <>
      <VideoGrid videos={videos} />
      <div ref={sentinel} className="text-muted-foreground flex min-h-16 items-center justify-center text-sm">
        {loading ? (
          "Cargando vídeos…"
        ) : loadError ? (
          <button className="underline" onClick={() => void loadMore()} type="button">
            {loadError} Reintentar.
          </button>
        ) : !cursor ? (
          "Has llegado al final."
        ) : null}
      </div>
    </>
  );
};
