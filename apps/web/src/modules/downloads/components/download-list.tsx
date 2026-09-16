import { Inbox } from "lucide-react";
import type { Download, DownloadAction } from "../types";
import { DownloadCard } from "./download-card";

export const DownloadList = ({
  downloads,
  pendingActions,
  onAction,
}: {
  downloads: Download[];
  pendingActions: Record<string, DownloadAction>;
  onAction: (download: Download, action: DownloadAction) => void;
}) =>
  downloads.length === 0 ? (
    <div className="border-border bg-card/40 grid min-h-56 place-items-center rounded-xl border border-dashed px-6 text-center">
      <div>
        <span className="bg-muted text-muted-foreground mx-auto grid size-11 place-items-center rounded-xl">
          <Inbox className="size-5" />
        </span>
        <p className="mt-3 font-semibold">Todavía no hay descargas</p>
        <p className="text-muted-foreground mt-1 text-sm">Pega un enlace directo para comenzar.</p>
      </div>
    </div>
  ) : (
    <div className="grid gap-3">
      {downloads.map((download) => (
        <DownloadCard
          key={download.id}
          download={download}
          pendingAction={pendingActions[download.id]}
          onAction={onAction}
        />
      ))}
    </div>
  );
