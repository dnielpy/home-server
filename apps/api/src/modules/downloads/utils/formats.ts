import { extname } from "node:path";
import type { DownloadDestination, DownloadLibraryStatus } from "@home-server/contracts/downloads";

const GALLERY_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"]);
const LOCALTUBE_EXTENSIONS = new Set([".mp4", ".webm"]);

export const getDownloadLibraryStatus = (destination: DownloadDestination, fileName: string): DownloadLibraryStatus => {
  const extension = extname(fileName).toLowerCase();
  return (destination === "gallery" ? GALLERY_EXTENSIONS : LOCALTUBE_EXTENSIONS).has(extension)
    ? "available"
    : "unsupported";
};
