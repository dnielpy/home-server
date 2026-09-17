"use client";

import { ArrowLeft, CheckCircle2, FileVideo, FolderPlus, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { localTubeUrls } from "@/src/modules/localtube/utils/urls";

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "complete" | "error";
  error?: string;
};
const valid = (file: File) => /\.(mp4|webm)$/i.test(file.name);

export const UploadView = () => {
  const input = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const update = (id: string, patch: Partial<UploadItem>) =>
    setUploads((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const upload = (file: File) =>
    new Promise<void>((resolve) => {
      const id = crypto.randomUUID();
      const item: UploadItem = { id, file, progress: 0, status: "queued" };
      setUploads((items) => [item, ...items]);
      const request = new XMLHttpRequest();
      request.open("POST", localTubeUrls.upload);
      request.setRequestHeader("Content-Type", "application/octet-stream");
      request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
      if (folder.trim()) request.setRequestHeader("X-Folder-Name", encodeURIComponent(folder.trim()));
      request.upload.onprogress = (event) => {
        if (event.lengthComputable)
          update(id, { status: "uploading", progress: Math.min(99, Math.round((event.loaded / event.total) * 100)) });
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) update(id, { status: "complete", progress: 100 });
        else {
          let message = "No se pudo subir el vídeo.";
          try {
            message =
              (JSON.parse(request.responseText) as { message?: string; error?: string }).message ??
              (JSON.parse(request.responseText) as { error?: string }).error ??
              message;
          } catch {}
          update(id, { status: "error", error: message });
        }
        resolve();
      };
      request.onerror = () => {
        update(id, { status: "error", error: "La conexión se interrumpió." });
        resolve();
      };
      update(id, { status: "uploading" });
      request.send(file);
    });
  const enqueue = (files: File[]) => {
    const accepted = files.filter(valid);
    const rejected = files.filter((file) => !valid(file));
    setSelectionError(
      rejected.length
        ? `Se omitieron ${rejected.length} archivo${rejected.length === 1 ? "" : "s"}. Solo se aceptan vídeos MP4 o WebM.`
        : null,
    );
    void Promise.all(accepted.map(upload));
  };
  return (
    <section className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">LocalTube</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Subir vídeos</h1>
          <p className="text-muted-foreground mt-2 text-sm">Añade MP4 o WebM a tu biblioteca privada.</p>
        </div>
        <Link
          href="/localtube"
          aria-label="Volver a la biblioteca"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-9"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
          Atrás
        </Link>
      </div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          enqueue(Array.from(event.dataTransfer.files));
        }}
        className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/60"}`}
      >
        <Upload className="text-primary size-9" />
        <span className="mt-4 font-semibold">Arrastra tus vídeos aquí</span>
        <span className="text-muted-foreground mt-1 text-sm">o selecciona archivos desde tu dispositivo</span>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          multiple
          onChange={(event) => {
            enqueue(Array.from(event.currentTarget.files ?? []));
            // Allow selecting the same file again after an error or a completed upload.
            event.currentTarget.value = "";
          }}
        />
      </label>
      {selectionError && <p className="text-destructive mt-3 text-sm">{selectionError}</p>}
      <label className="mt-5 block max-w-md text-sm font-medium">
        <span className="flex items-center gap-2">
          <FolderPlus className="size-4" /> Carpeta opcional
        </span>
        <input
          value={folder}
          onChange={(event) => setFolder(event.currentTarget.value)}
          maxLength={255}
          placeholder="Ej. Películas"
          className="border-input bg-background focus:ring-ring/20 mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
        />
      </label>
      {uploads.length > 0 && (
        <div className="mt-6 grid gap-3">
          {uploads.map((item) => (
            <article key={item.id} className="border-border bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileVideo className="text-primary size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded">
                    <div className="bg-primary h-full transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
                {item.status === "complete" ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : item.status === "error" ? (
                  <XCircle className="text-destructive size-5" />
                ) : (
                  <span className="text-muted-foreground text-xs">{item.progress}%</span>
                )}
              </div>
              {item.error && <p className="text-destructive mt-2 text-xs">{item.error}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
