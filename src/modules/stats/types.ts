export type PieSegment = {
  name: string;
  value: number;
  color: string;
};

export type CpuMetric = {
  used: number | null;
  idle: number | null;
};

export type MemoryMetric = {
  total: number;
  used: number;
  available: number;
  percentUsed: number;
};

export type StorageMetric = {
  mount: string;
  total: number;
  used: number;
  available: number;
  percentUsed: number;
};

export type NetworkMetric = {
  interfaceName: string | null;
  receivedBytes: number;
  transmittedBytes: number;
  receiveRate: number | null;
  transmitRate: number | null;
};

export type SystemMetrics = {
  updatedAt: string;
  cpu: CpuMetric;
  memory: MemoryMetric;
  systemStorage: StorageMetric | null;
  externalStorage: StorageMetric | null;
  network: NetworkMetric;
};

export type NetworkHistoryPoint = {
  time: string;
  received: number | null;
  transmitted: number | null;
};

export type MetricsErrorPayload = {
  error: string;
};
