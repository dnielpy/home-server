import { galleryUploadResultSchema, type GalleryUploadResult } from "@home-server/contracts/gallery";

const GALLERY_UPLOAD_BFF = "/api/gallery/uploads";

export type GalleryUploadTask = {
  promise: Promise<GalleryUploadResult>;
  abort: () => void;
};

export type GalleryUploadRequest = {
  file: File;
  folderName?: string | null;
  onProgress?: (progress: number) => void;
};

type GalleryApiError = { message?: string; error?: string };

const readJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getErrorMessage = (value: unknown, fallback: string): string => {
  if (typeof value === "object" && value !== null) {
    const body = value as GalleryApiError;
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
  }
  return fallback;
};

/** Starts a streamed upload through the authenticated Gallery BFF. */
export const uploadGalleryFile = ({ file, folderName, onProgress }: GalleryUploadRequest): GalleryUploadTask => {
  const request = new XMLHttpRequest();
  const promise = new Promise<GalleryUploadResult>((resolve, reject) => {
    request.open("POST", GALLERY_UPLOAD_BFF);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    if (folderName) request.setRequestHeader("X-Folder-Name", encodeURIComponent(folderName));

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    request.onload = () => {
      const body = readJson(request.responseText);
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(getErrorMessage(body, "No se pudo subir el archivo.")));
        return;
      }
      const parsed = galleryUploadResultSchema.safeParse(body);
      if (!parsed.success) {
        reject(new Error("El servidor devolvió una respuesta de subida inválida."));
        return;
      }
      resolve(parsed.data);
    };
    request.onerror = () => reject(new Error("La conexión se interrumpió."));
    request.onabort = () => reject(new Error("La subida fue cancelada."));
    request.send(file);
  });

  return { promise, abort: () => request.abort() };
};
