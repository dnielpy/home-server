"use client";

import { Download as DownloadIcon, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/src/modules/common/components/button";
import type { DownloadDestination } from "../types";

export const DownloadForm = ({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (url: string, destination: DownloadDestination) => Promise<boolean>;
}) => {
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState<DownloadDestination | "">("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!destination || !(await onSubmit(url, destination))) return;
    setUrl("");
  };
  return (
    <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]" onSubmit={(event) => void submit(event)}>
      <label className="sr-only" htmlFor="download-url">
        Enlace de descarga
      </label>
      <input
        id="download-url"
        type="url"
        required
        autoComplete="off"
        value={url}
        onChange={(event) => setUrl(event.currentTarget.value)}
        disabled={isSubmitting}
        placeholder="Pega un enlace HTTP o HTTPS…"
        className="border-input bg-background focus:border-ring focus:ring-ring/20 h-11 min-w-0 rounded-lg border px-3 text-sm transition outline-none focus:ring-3"
      />
      <label className="sr-only" htmlFor="download-destination">
        Destino
      </label>
      <select
        id="download-destination"
        required
        value={destination}
        onChange={(event) => setDestination(event.currentTarget.value as DownloadDestination | "")}
        disabled={isSubmitting}
        className="border-input bg-background focus:border-ring focus:ring-ring/20 h-11 rounded-lg border px-3 text-sm outline-none focus:ring-3"
      >
        <option value="">¿Dónde guardarlo?</option>
        <option value="gallery">Gallery</option>
        <option value="localtube">LocalTube</option>
      </select>
      <Button type="submit" size="lg" disabled={isSubmitting || !url.trim() || !destination}>
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <DownloadIcon />}
        {isSubmitting ? "Añadiendo…" : "Descargar"}
      </Button>
    </form>
  );
};
