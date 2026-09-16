import type {
  Download,
  DownloadAction,
  DownloadDestination,
  DownloadsResponse,
} from "@home-server/contracts/downloads";

export type { Download, DownloadAction, DownloadDestination, DownloadsResponse };

export type DownloadsContextValue = {
  data: DownloadsResponse;
  connectionError: string | null;
  operationError: string | null;
  isCreating: boolean;
  pendingActions: Record<string, DownloadAction>;
  add: (url: string, destination: DownloadDestination) => Promise<boolean>;
  runAction: (download: Download, action: DownloadAction) => Promise<void>;
  dismissOperationError: () => void;
};
