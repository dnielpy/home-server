"use client";

import Link from "next/link";
import { ArrowLeft, Images, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGalleryMedia } from "@/src/lib/services/gallery";
import { MediaViewer } from "./media-viewer";
import {
  formatGalleryDate,
  formatGalleryDuration,
  toGalleryMediaPageView,
  type GalleryMediaPageView,
  type GalleryMediaView,
} from "./types/gallery";
import { createJustifiedRows } from "./utils/gallery-layout";

type GalleryViewProps = {
  title: string;
  albumId?: string;
  initialPage: GalleryMediaPageView;
  initialError?: string;
};

export function GalleryView({ title, albumId, initialPage, initialError }: GalleryViewProps) {
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const error = initialError;
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setMoreError(null);
    try {
      const result = await getGalleryMedia(albumId, cursor);
      if (!result.success) throw new Error(result.error.message);
      const page = toGalleryMediaPageView(result.data);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (caught) {
      setMoreError(caught instanceof Error ? caught.message : "No se pudo cargar más contenido.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [albumId, cursor]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  const groups = useMemo(() => {
    const map = new Map<string, GalleryMediaView[]>();
    for (const item of items) {
      const date = new Date(item.modifiedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return [...map.entries()].map(([key, group]) => ({
      key,
      label: formatGalleryDate(group[0].modifiedAt),
      items: group,
    }));
  }, [items]);
  const selectedIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1;
  const open = (id: string) => {
    setSelectedId(id);
    const index = items.findIndex((item) => item.id === id);
    if (index >= items.length - 5) void loadMore();
  };

  if (error) return <GalleryMessage title="Biblioteca no disponible" message={error} retry />;
  if (!items.length)
    return (
      <GalleryMessage
        title={albumId ? "Este álbum está vacío" : "Todavía no hay fotos ni vídeos"}
        message="Sube archivos compatibles a Gallery para verlos aquí."
      />
    );

  return (
    <>
      <section ref={root} className="mx-auto max-w-[1800px]">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-3 px-1 sm:items-end sm:gap-4">
          <div>
            {albumId ? (
              <Link
                href="/gallery/albums"
                className="text-primary inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase hover:underline"
              >
                <ArrowLeft className="size-3.5" /> Álbumes
              </Link>
            ) : (
              <p className="text-primary text-xs font-semibold tracking-wider uppercase">Gallery</p>
            )}
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
          </div>
          <span className="text-muted-foreground shrink-0 text-sm">
            {items.length}
            {cursor ? "+" : ""} elementos
          </span>
        </header>
        {width > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <MediaGroup key={group.key} label={group.label} items={group.items} width={width} onOpen={open} />
            ))}
          </div>
        )}
        <div ref={sentinel} className="text-muted-foreground flex min-h-24 items-center justify-center text-sm">
          {loading && "Cargando más…"}
          {moreError && (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="hover:bg-muted inline-flex items-center gap-2 rounded-full px-4 py-2"
            >
              <RefreshCw className="size-4" />
              {moreError}
            </button>
          )}
          {!cursor && !loading && "Has llegado al final de tu biblioteca."}
        </div>
      </section>
      {selectedIndex >= 0 && (
        <MediaViewer
          items={items}
          index={selectedIndex}
          onClose={() => setSelectedId(null)}
          onNavigate={(index) => {
            setSelectedId(items[index]?.id ?? null);
            if (index >= items.length - 5) void loadMore();
          }}
        />
      )}
    </>
  );
}

function MediaGroup({
  label,
  items,
  width,
  onOpen,
}: {
  label: string;
  items: GalleryMediaView[];
  width: number;
  onOpen: (id: string) => void;
}) {
  const rows = useMemo(() => createJustifiedRows(items, width), [items, width]);
  return (
    <section>
      <h2 className="mb-3 px-1 text-sm font-semibold capitalize">{label}</h2>
      <div className="space-y-1">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-1" style={{ height: row.height }}>
            {row.items.map(({ media, width: itemWidth }) => (
              <button
                key={media.id}
                type="button"
                onClick={() => onOpen(media.id)}
                className="bg-muted group focus-visible:ring-ring relative block shrink-0 overflow-hidden rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                style={{ width: itemWidth }}
                aria-label={`Abrir ${media.fileName}`}
              >
                <img
                  src={media.thumbnailUrl}
                  alt=""
                  className="size-full object-cover transition duration-200 group-hover:scale-[1.03]"
                />
                <span className="sr-only">{media.fileName}</span>
                {media.kind === "video" && (
                  <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
                    {formatGalleryDuration(media.durationSeconds)}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function GalleryMessage({ title, message, retry }: { title: string; message: string; retry?: boolean }) {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div>
        <span className="bg-muted text-primary mx-auto grid size-16 place-items-center rounded-full">
          <Images className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">{message}</p>
        {retry && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground mt-5 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Reintentar
          </button>
        )}
      </div>
    </section>
  );
}
