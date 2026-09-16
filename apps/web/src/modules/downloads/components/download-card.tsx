"use client";

import { AlertTriangle, FileDown, LoaderCircle, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/src/modules/common/components/button";
import type { Download, DownloadAction } from "../types";
import { getAllowedActions } from "../utils/actions";
import { formatBytes, formatEta, formatPercent, formatSpeed } from "../utils/format";

const ACTION_PRESENTATION = {
  pause: { label: "Pausar", icon: Pause, variant: "secondary" as const },
  resume: { label: "Reanudar", icon: Play, variant: "secondary" as const },
  retry: { label: "Reintentar", icon: RotateCcw, variant: "secondary" as const },
  cancel: { label: "Cancelar", icon: Trash2, variant: "destructive" as const },
};
const statusLabels = {
  waiting: "En espera",
  active: "Descargando",
  paused: "Pausada",
  complete: "Completada",
  error: "Error",
  removed: "Cancelada",
} as const;

export const DownloadCard = ({
  download,
  pendingAction,
  onAction,
}: {
  download: Download;
  pendingAction?: DownloadAction;
  onAction: (download: Download, action: DownloadAction) => void;
}) => {
  const actions = getAllowedActions(download.status);
  const secondary =
    download.status === "complete"
      ? `${formatBytes(download.totalBytes)} descargados`
      : `${formatBytes(download.completedBytes)} de ${download.totalBytes ? formatBytes(download.totalBytes) : "tamaño desconocido"}`;
  return (
    <article className="border-border bg-card min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className="bg-secondary text-secondary-foreground grid size-9 shrink-0 place-items-center rounded-lg">
          <FileDown className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold" title={download.fileName}>
                {download.fileName}
              </h2>
              <p className="text-muted-foreground mt-1 truncate text-xs" title={download.url}>
                {download.url}
              </p>
            </div>
            <span className="bg-muted shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold">
              {statusLabels[download.status]}
            </span>
          </div>
          <div className="bg-muted mt-4 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${download.progress}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:justify-between">
            <p>
              <strong className="text-foreground">{formatPercent(download.progress)}</strong> · {secondary}
            </p>
            <p>
              {download.status === "active"
                ? `${formatSpeed(download.speedBytesPerSecond)} · ${formatEta(download.etaSeconds)}`
                : statusLabels[download.status]}
            </p>
          </div>
          {download.libraryStatus === "unsupported" && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              El archivo se descargó, pero su formato no será indexado por{" "}
              {download.destination === "gallery" ? "Gallery" : "LocalTube"}.
            </p>
          )}
          {download.errorMessage && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {download.errorMessage}
            </p>
          )}
          {actions.length > 0 && (
            <div className="border-border mt-3 flex flex-wrap gap-2 border-t pt-3">
              {actions.map((action) => {
                const presentation = ACTION_PRESENTATION[action];
                const Icon = presentation.icon;
                const pending = pendingAction === action;
                return (
                  <Button
                    key={action}
                    size="sm"
                    variant={presentation.variant}
                    disabled={Boolean(pendingAction)}
                    onClick={() => onAction(download, action)}
                  >
                    {pending ? <LoaderCircle className="animate-spin" /> : <Icon />}
                    {pending ? `${presentation.label}…` : presentation.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
