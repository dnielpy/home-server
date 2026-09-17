import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Upload } from "lucide-react";
import { getGalleryMedia } from "@/src/lib/services/gallery";
import { GalleryView } from "@/src/modules/gallery/gallery-view";
import { toGalleryMediaPageView } from "@/src/modules/gallery/types/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Gallery · Home Server",
  description: "Tu biblioteca privada de fotos y vídeos.",
};

export default async function GalleryPage() {
  const result = await getGalleryMedia();
  return (
    <>
      <div className="mx-auto -mt-2 mb-4 flex flex-wrap justify-end gap-2">
        <Link
          href="/gallery/albums"
          className="bg-muted hover:bg-muted/70 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold sm:h-9"
        >
          <FolderOpen className="size-4" /> Álbumes
        </Link>
        <Link
          href="/gallery/upload"
          className="bg-primary text-primary-foreground inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold sm:h-9"
        >
          <Upload className="size-4" /> Subir
        </Link>
      </div>
      <GalleryView
        title="Biblioteca"
        initialPage={result.success ? toGalleryMediaPageView(result.data) : { items: [], nextCursor: null }}
        initialError={result.success ? undefined : result.error.message}
      />
    </>
  );
}
