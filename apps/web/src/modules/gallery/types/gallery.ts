import type { GalleryAlbumSummary, GalleryMedia, GalleryMediaPage } from "@home-server/contracts/gallery";

export type GalleryMediaView = GalleryMedia & { contentUrl: string; thumbnailUrl: string };
export type GalleryMediaPageView = { items: GalleryMediaView[]; nextCursor: string | null };
export type GalleryAlbumSummaryView = Omit<GalleryAlbumSummary, "cover"> & { cover: GalleryMediaView | null };

export function toGalleryMediaView(media: GalleryMedia): GalleryMediaView {
  const version = `${media.size}-${encodeURIComponent(media.modifiedAt)}`;
  const root = `/api/gallery/media/${encodeURIComponent(media.id)}`;
  return { ...media, contentUrl: `${root}/content?v=${version}`, thumbnailUrl: `${root}/thumbnail?v=${version}` };
}

export function toGalleryMediaPageView(page: GalleryMediaPage): GalleryMediaPageView {
  return { items: page.items.map(toGalleryMediaView), nextCursor: page.nextCursor };
}

export function toGalleryAlbumSummaryView(album: GalleryAlbumSummary): GalleryAlbumSummaryView {
  return { ...album, cover: album.cover ? toGalleryMediaView(album.cover) : null };
}

export function formatGalleryDate(value: string, now = new Date()) {
  const date = new Date(value);
  const key = (candidate: Date) => `${candidate.getFullYear()}-${candidate.getMonth()}-${candidate.getDate()}`;
  if (key(date) === key(now)) return "Hoy";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key(date) === key(yesterday)) return "Ayer";
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

export function formatGalleryDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "";
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
}
