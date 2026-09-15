import type { Metadata } from "next";
import { getGalleryMedia } from "@/src/lib/services/gallery";
import { GalleryView } from "@/src/modules/gallery/gallery-view";
import { toGalleryMediaPageView } from "@/src/modules/gallery/types/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Álbum · Gallery" };

export default async function GalleryAlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const result = await getGalleryMedia(albumId);
  return (
    <GalleryView
      title="Álbum"
      albumId={albumId}
      initialPage={result.success ? toGalleryMediaPageView(result.data) : { items: [], nextCursor: null }}
      initialError={result.success ? undefined : result.error.message}
    />
  );
}
