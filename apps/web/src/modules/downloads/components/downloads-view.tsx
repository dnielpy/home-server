"use client";

import { AlertCircle, ServerOff, X } from "lucide-react";
import { DownloadForm } from "./download-form";
import { DownloadList } from "./download-list";
import { GlobalStats } from "./global-stats";
import { useDownloads } from "../providers/downloads-provider";

export const DownloadsView = () => {
  const { data, connectionError, operationError, isCreating, pendingActions, add, runAction, dismissOperationError } =
    useDownloads();
  return (
    <section className="mx-auto max-w-[1060px]">
      <div className="max-w-2xl">
        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">Descargas privadas</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Descargas</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Añade un enlace directo y aria2 continuará descargándolo aunque cierres esta página.
        </p>
      </div>
      <div className="border-border bg-card mt-6 rounded-xl border p-4 shadow-sm sm:p-5">
        <DownloadForm isSubmitting={isCreating} onSubmit={add} />
      </div>
      {(connectionError || operationError) && (
        <div className="mt-4 grid gap-2" aria-live="polite">
          {connectionError && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <ServerOff className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>aria2 no está disponible.</strong> {connectionError}
              </span>
            </div>
          )}
          {operationError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{operationError}</span>
              <button type="button" aria-label="Cerrar error" onClick={dismissOperationError}>
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="mt-5">
        <GlobalStats stats={data.stats} />
      </div>
      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Todas las descargas</h2>
        <span className="text-muted-foreground text-xs font-medium">{data.downloads.length} total</span>
      </div>
      <DownloadList
        downloads={data.downloads}
        pendingActions={pendingActions}
        onAction={(download, action) => void runAction(download, action)}
      />
    </section>
  );
};
