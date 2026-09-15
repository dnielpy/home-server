"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type TouchEvent, type WheelEvent } from "react";
import { formatGalleryDuration, type GalleryMediaView } from "./types/gallery";

export function MediaViewer({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryMediaView[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const media = items[index];
  const close = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previousFocus.current?.focus();
    };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onNavigate(index - 1);
      }
      if (event.key === "ArrowRight" && index < items.length - 1) {
        event.preventDefault();
        onNavigate(index + 1);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [index, items.length, onClose, onNavigate]);
  useEffect(() => {
    for (const candidate of [items[index - 1], items[index + 1]])
      if (candidate?.kind === "image") {
        const preload = new Image();
        preload.src = candidate.contentUrl;
      }
  }, [index, items]);
  if (!media) return null;
  const previous = index > 0;
  const next = index < items.length - 1;
  const onTouchStart = (event: TouchEvent) => {
    touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    const end = event.changedTouches[0];
    touch.current = null;
    if (!start || !end) return;
    const x = end.clientX - start.x;
    const y = end.clientY - start.y;
    if (Math.abs(x) > 70 && Math.abs(x) > Math.abs(y) * 1.4) {
      if (x > 0 && previous) onNavigate(index - 1);
      if (x < 0 && next) onNavigate(index + 1);
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Viendo ${media.fileName}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#0e0f11] text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex h-16 shrink-0 items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 sm:px-5">
        <button
          ref={close}
          type="button"
          aria-label="Cerrar visor"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <X />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{media.fileName}</p>
          <p className="mt-0.5 text-xs text-white/65">
            {new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(media.modifiedAt),
            )}
          </p>
        </div>
        <span className="ml-auto pr-2 text-xs text-white/60 tabular-nums">
          {index + 1} / {items.length}
        </span>
      </header>
      <main className="relative min-h-0 flex-1 sm:px-16 sm:pb-4">
        <div className="size-full overflow-hidden sm:rounded-xl">
          {media.kind === "image" ? (
            <PhotoViewer key={media.id} media={media} />
          ) : (
            <VideoPlayer key={media.id} media={media} />
          )}
        </div>
        <Navigate direction="previous" disabled={!previous} onClick={() => onNavigate(index - 1)} />
        <Navigate direction="next" disabled={!next} onClick={() => onNavigate(index + 1)} />
      </main>
    </div>
  );
}

function Navigate({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      aria-label={isPrevious ? "Elemento anterior" : "Elemento siguiente"}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white shadow-lg hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:hidden sm:grid ${isPrevious ? "left-2" : "right-2"}`}
    >
      {isPrevious ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

function PhotoViewer({ media }: { media: GalleryMediaView }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const reset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  const setNextZoom = (value: number) => {
    const next = Math.min(5, Math.max(1, value));
    setZoom(next);
    if (next === 1) setPosition({ x: 0, y: 0 });
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    setNextZoom(zoom + (event.deltaY < 0 ? 0.15 : -0.15));
  };
  const pointerDown = (event: PointerEvent) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { x: event.clientX, y: event.clientY, originX: position.x, originY: position.y };
  };
  const pointerMove = (event: PointerEvent) => {
    const start = dragging.current;
    if (start) setPosition({ x: start.originX + event.clientX - start.x, y: start.originY + event.clientY - start.y });
  };
  return (
    <div
      className="relative grid size-full place-items-center bg-black"
      onWheel={wheel}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onDoubleClick={() => (zoom > 1 ? reset() : setNextZoom(2))}
    >
      <img
        src={media.contentUrl}
        alt={media.fileName}
        draggable={false}
        className="max-h-full max-w-full object-contain select-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          cursor: zoom > 1 ? "grab" : "zoom-in",
        }}
      />
      <div className="absolute right-3 bottom-3 flex items-center rounded-full bg-black/65 p-1 text-white backdrop-blur">
        <button
          type="button"
          aria-label="Alejar"
          onClick={() => setNextZoom(zoom - 0.25)}
          className="grid size-9 place-items-center rounded-full hover:bg-white/15"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Acercar"
          onClick={() => setNextZoom(zoom + 0.25)}
          className="grid size-9 place-items-center rounded-full hover:bg-white/15"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Restablecer zoom"
          onClick={reset}
          className="grid size-9 place-items-center rounded-full hover:bg-white/15"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}

function VideoPlayer({ media }: { media: GalleryMediaView }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds ?? 0);
  const toggle = async () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) await element.play();
    else element.pause();
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const element = video.current;
      if (!element) return;
      if (event.key === " ") {
        event.preventDefault();
        void toggle();
      }
      if (event.key.toLowerCase() === "j") element.currentTime = Math.max(0, element.currentTime - 5);
      if (event.key.toLowerCase() === "l")
        element.currentTime = Math.min(element.duration || Infinity, element.currentTime + 5);
      if (event.key.toLowerCase() === "m") element.muted = !element.muted;
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  return (
    <div className="relative grid size-full place-items-center bg-black">
      <video
        ref={video}
        src={media.contentUrl}
        poster={media.thumbnailUrl}
        className="max-h-full max-w-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      />
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/85 to-transparent px-3 pt-12 pb-3">
        <input
          aria-label="Posición del vídeo"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={current}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (video.current) video.current.currentTime = value;
            setCurrent(value);
          }}
          className="accent-primary w-full"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            aria-label={playing ? "Pausar" : "Reproducir"}
            onClick={() => void toggle()}
            className="grid size-9 place-items-center rounded-full hover:bg-white/15"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button
            type="button"
            aria-label={muted ? "Activar sonido" : "Silenciar"}
            onClick={() => {
              if (video.current) video.current.muted = !video.current.muted;
            }}
            className="grid size-9 place-items-center rounded-full hover:bg-white/15"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <span className="text-xs tabular-nums">
            {formatGalleryDuration(current)} / {formatGalleryDuration(duration)}
          </span>
          <button
            type="button"
            aria-label="Pantalla completa"
            onClick={() => video.current?.requestFullscreen()}
            className="ml-auto grid size-9 place-items-center rounded-full hover:bg-white/15"
          >
            <Maximize className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
