import type { DownloadStatus } from "@home-server/contracts/downloads";

export type Aria2Uri = { uri: string; status: "used" | "waiting" };
export type Aria2File = { path: string; uris: Aria2Uri[] };
export type Aria2Download = {
  gid: string;
  status: DownloadStatus;
  totalLength: string;
  completedLength: string;
  downloadSpeed: string;
  errorMessage?: string;
  files: Aria2File[];
};
export type Aria2GlobalStat = {
  downloadSpeed: string;
  numActive: string;
  numWaiting: string;
};
export type Aria2Snapshot = { downloads: Aria2Download[]; stats: Aria2GlobalStat };
