"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, File, Upload, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getGalleryAlbums } from "@/src/lib/services/gallery";
import { uploadGalleryFile, type GalleryUploadTask } from "@/src/lib/services/gallery-upload";
import type { GalleryAlbumSummary } from "@home-server/contracts/gallery";

type QueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "complete" | "error";
  error?: string;
  storedName?: string;
};
const id = () =>
  globalThis.crypto?.randomUUID?.() ?? `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function GalleryUploadView() {
  const input = useRef<HTMLInputElement>(null);
  const requests = useRef(new Map<string, GalleryUploadTask>());
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbumSummary[]>([]);
  const [target, setTarget] = useState<"root" | "album" | "folder">("root");
  const [albumId, setAlbumId] = useState("");
  const [folder, setFolder] = useState("");
  const [dragging, setDragging] = useState(false);
  useEffect(
    () => () => {
      for (const request of requests.current.values()) request.abort();
    },
    [],
  );
  const update = (itemId: string, patch: Partial<QueueItem>) =>
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  const choose = async (next: File[]) => {
    if (!next.length) return;
    setFiles(next);
    const result = await getGalleryAlbums();
    if (!result.success) {
      setAlbums([]);
      setAlbumId("");
      return;
    }
    setAlbums(result.data);
    setAlbumId(result.data[0]?.id ?? "");
  };
  const upload = async (item: QueueItem, folderName: string | null) => {
    update(item.id, { status: "uploading" });
    const task = uploadGalleryFile({
      file: item.file,
      folderName,
      onProgress: (progress) => update(item.id, { progress }),
    });
    requests.current.set(item.id, task);
    try {
      const result = await task.promise;
      update(item.id, { status: "complete", progress: 100, storedName: result.fileName });
    } catch (error) {
      update(item.id, {
        status: "error",
        error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
      });
    } finally {
      requests.current.delete(item.id);
    }
  };
  const start = () => {
    const destination =
      target === "folder"
        ? folder.trim()
        : target === "album"
          ? (albums.find((album) => album.id === albumId)?.name ?? null)
          : null;
    if (target === "folder" && !destination) return;
    const queued = files.map((file) => ({ id: id(), file, progress: 0, status: "queued" as const }));
    setFiles([]);
    setItems((current) => [...queued, ...current]);
    let next = 0;
    const worker = async () => {
      while (next < queued.length) await upload(queued[next++], destination);
    };
    void Promise.all(Array.from({ length: Math.min(3, queued.length) }, worker));
  };
  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">Gallery</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Subir archivos</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Añade fotos, vídeos u otros archivos a tu biblioteca privada.
          </p>
        </div>
        <Link
          href="/gallery"
          className="text-muted-foreground hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium"
        >
          <ArrowLeft className="size-5" /> Atrás
        </Link>
      </header>
      <label
        className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/60"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void choose(Array.from(event.dataTransfer.files));
        }}
      >
        <Upload className="text-primary size-9" />
        <span className="mt-4 font-semibold">Arrastra archivos aquí</span>
        <span className="text-muted-foreground mt-1 text-sm">o selecciónalos desde tu dispositivo</span>
        <input
          ref={input}
          aria-label="Seleccionar archivos"
          className="sr-only"
          type="file"
          multiple
          onChange={(event) => void choose(Array.from(event.currentTarget.files ?? []))}
        />
      </label>
      {files.length > 0 && (
        <div className="border-border bg-card mt-5 rounded-xl border p-5">
          <h2 className="font-semibold">
            Destino de {files.length} {files.length === 1 ? "archivo" : "archivos"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex gap-2 text-sm">
              <input type="radio" checked={target === "root"} onChange={() => setTarget("root")} /> Biblioteca
            </label>
            <label className="flex gap-2 text-sm">
              <input type="radio" checked={target === "album"} onChange={() => setTarget("album")} /> Álbum existente
            </label>
            <label className="flex gap-2 text-sm">
              <input type="radio" checked={target === "folder"} onChange={() => setTarget("folder")} /> Nueva carpeta
            </label>
          </div>
          {target === "album" && (
            <select
              aria-label="Álbum"
              value={albumId}
              onChange={(event) => setAlbumId(event.target.value)}
              className="border-input bg-background mt-4 h-10 w-full rounded-lg border px-3 text-sm"
            >
              <option value="">Selecciona un álbum</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
          )}
          {target === "folder" && (
            <input
              aria-label="Nombre de carpeta"
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              placeholder="Ej. Vacaciones"
              className="border-input bg-background mt-4 h-10 w-full rounded-lg border px-3 text-sm"
            />
          )}
          <button
            type="button"
            onClick={start}
            disabled={target === "album" && !albumId}
            className="bg-primary text-primary-foreground mt-5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Iniciar subida
          </button>
        </div>
      )}
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="border-border bg-card rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <File className="text-primary size-5 shrink-0" />
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
            {item.storedName && <p className="text-muted-foreground mt-2 text-xs">Guardado como {item.storedName}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
