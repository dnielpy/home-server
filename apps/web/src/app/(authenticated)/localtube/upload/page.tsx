import type { Metadata } from "next";
import { UploadView } from "@/src/modules/localtube/components/upload-view";

export const metadata: Metadata = {
  title: "Subir vídeos · LocalTube",
  description: "Sube vídeos a tu biblioteca LocalTube.",
};

export default function LocalTubeUploadPage() {
  return <UploadView />;
}
