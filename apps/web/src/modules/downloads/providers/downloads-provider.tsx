"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  downloadsResponseSchema,
  downloadSchema,
  type DownloadAction,
  type DownloadDestination,
  type Download,
  type DownloadsResponse,
} from "@home-server/contracts/downloads";
import type { DownloadsContextValue } from "../types";

const EMPTY_DATA: DownloadsResponse = {
  downloads: [],
  stats: { downloadSpeedBytesPerSecond: 0, active: 0, waiting: 0, stopped: 0 },
};
const DownloadsContext = createContext<DownloadsContextValue | null>(null);

const responseError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string; error?: { message?: string } };
    return payload.error?.message ?? payload.message ?? `La solicitud falló (HTTP ${response.status}).`;
  } catch {
    return `La solicitud falló (HTTP ${response.status}).`;
  }
};

export const DownloadsProvider = ({
  initialData,
  initialError,
  children,
}: {
  initialData: DownloadsResponse | null;
  initialError?: string;
  children: ReactNode;
}) => {
  const [data, setData] = useState(initialData ?? EMPTY_DATA);
  const [connectionError, setConnectionError] = useState<string | null>(initialError ?? null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingActions, setPendingActions] = useState<Record<string, DownloadAction>>({});
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poll = useRef<() => Promise<void>>(async () => undefined);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/downloads", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const parsed = downloadsResponseSchema.parse(await response.json());
      if (mounted.current) {
        setData(parsed);
        setConnectionError(null);
      }
    } catch (error) {
      if (mounted.current)
        setConnectionError(error instanceof Error ? error.message : "No se pudieron actualizar las descargas.");
    } finally {
      if (mounted.current && document.visibilityState !== "hidden")
        timer.current = setTimeout(() => void poll.current(), 1_000);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    poll.current = refresh;
    timer.current = setTimeout(() => void poll.current(), 0);
    const visibility = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refresh]);

  const add = useCallback(
    async (url: string, destination: DownloadDestination) => {
      setIsCreating(true);
      setOperationError(null);
      try {
        const response = await fetch("/api/downloads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, destination }),
        });
        if (!response.ok) throw new Error(await responseError(response));
        const download = downloadSchema.parse(((await response.json()) as { download: unknown }).download);
        setData((current) => ({ ...current, downloads: [download, ...current.downloads] }));
        void refresh();
        return true;
      } catch (error) {
        setOperationError(error instanceof Error ? error.message : "No se pudo crear la descarga.");
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [refresh],
  );

  const runAction = useCallback(
    async (download: Download, action: DownloadAction) => {
      setPendingActions((current) => ({ ...current, [download.id]: action }));
      setOperationError(null);
      const endpoint =
        action === "cancel" ? `/api/downloads/${download.id}` : `/api/downloads/${download.id}/${action}`;
      try {
        const response = await fetch(endpoint, { method: action === "cancel" ? "DELETE" : "POST" });
        if (!response.ok) throw new Error(await responseError(response));
        const next = downloadSchema.parse(((await response.json()) as { download: unknown }).download);
        setData((current) => ({
          ...current,
          downloads: current.downloads.map((item) => (item.id === next.id ? next : item)),
        }));
        void refresh();
      } catch (error) {
        setOperationError(error instanceof Error ? error.message : "No se pudo ejecutar la acción.");
      } finally {
        setPendingActions((current) => {
          const next = { ...current };
          delete next[download.id];
          return next;
        });
      }
    },
    [refresh],
  );

  return (
    <DownloadsContext.Provider
      value={{
        data,
        connectionError,
        operationError,
        isCreating,
        pendingActions,
        add,
        runAction,
        dismissOperationError: () => setOperationError(null),
      }}
    >
      {children}
    </DownloadsContext.Provider>
  );
};

export const useDownloads = () => {
  const context = useContext(DownloadsContext);
  if (!context) throw new Error("useDownloads debe usarse dentro de DownloadsProvider.");
  return context;
};
