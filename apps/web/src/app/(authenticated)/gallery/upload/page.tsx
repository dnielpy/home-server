import type { Metadata } from "next";
import { GalleryUploadView } from "@/src/modules/gallery/upload-view";

export const metadata: Metadata = { title: "Subir archivos · Gallery" };

export default function GalleryUploadPage() {
  return <GalleryUploadView />;
}
