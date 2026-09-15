import type { Metadata } from "next";
import { getGalleryAlbums } from "@/src/lib/services/gallery";
import { AlbumsView } from "@/src/modules/gallery/albums-view";
import { toGalleryAlbumSummaryView } from "@/src/modules/gallery/types/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Álbumes · Gallery" };

export default async function GalleryAlbumsPage() {
  const result = await getGalleryAlbums();
  return (
    <AlbumsView
      albums={result.success ? result.data.map(toGalleryAlbumSummaryView) : []}
      error={result.success ? undefined : result.error.message}
    />
  );
}
