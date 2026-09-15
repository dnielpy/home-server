import type { GalleryMediaView } from "../types/gallery";

export function createJustifiedRows(media: GalleryMediaView[], width: number, targetHeight = 210, gap = 4) {
  if (width <= 0) return [] as Array<{ height: number; items: Array<{ media: GalleryMediaView; width: number }> }>;
  const rows: Array<{ height: number; items: Array<{ media: GalleryMediaView; width: number }> }> = [];
  let current: GalleryMediaView[] = [];
  let ratio = 0;
  const flush = (justify: boolean) => {
    if (!current.length) return;
    const natural = Math.max(1, width - gap * (current.length - 1)) / ratio;
    const height = justify ? natural : Math.min(targetHeight, natural);
    rows.push({ height, items: current.map((item) => ({ media: item, width: height * safeRatio(item) })) });
    current = [];
    ratio = 0;
  };
  for (const item of media) {
    current.push(item);
    ratio += safeRatio(item);
    if ((width - gap * (current.length - 1)) / ratio <= targetHeight) flush(true);
  }
  flush(false);
  return rows;
}

function safeRatio(media: Pick<GalleryMediaView, "width" | "height">) {
  const ratio = media.width / media.height;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}
