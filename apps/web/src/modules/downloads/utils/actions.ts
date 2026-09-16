import type { DownloadAction } from "@home-server/contracts/downloads";
import type { DownloadStatus } from "@home-server/contracts/downloads";

const ALLOWED_ACTIONS: Record<DownloadStatus, DownloadAction[]> = {
  active: ["pause", "cancel"],
  waiting: ["pause", "cancel"],
  paused: ["resume", "cancel"],
  complete: [],
  error: ["retry"],
  removed: ["retry"],
};

export const getAllowedActions = (status: DownloadStatus) => ALLOWED_ACTIONS[status];
