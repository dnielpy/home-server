import type { SystemMetrics } from "@home-server/contracts/stats";

export type { NetworkHistoryPoint, SystemMetrics } from "@home-server/contracts/stats";

export type PieSegment = {
  name: string;
  value: number;
  color: string;
};

export type StorageMetric = NonNullable<SystemMetrics["systemStorage"]>;
export type NetworkMetric = SystemMetrics["network"];
