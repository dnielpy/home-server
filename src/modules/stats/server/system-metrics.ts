import si from "systeminformation";
import type { NetworkMetric, StorageMetric, SystemMetrics } from "@/src/modules/stats/types";

type FileSystemSize = {
  mount: string;
  size: number;
  used: number;
  available: number;
};

type NetworkStats = {
  rx_bytes: number;
  tx_bytes: number;
  rx_sec: number | null;
  tx_sec: number | null;
};

type SystemInformationClient = {
  currentLoad: () => Promise<{ currentLoad: number; currentLoadIdle: number }>;
  mem: () => Promise<{ total: number; active: number; available: number }>;
  fsSize: () => Promise<FileSystemSize[]>;
  networkInterfaceDefault: () => Promise<string>;
  networkStats: (interfaceName: string) => Promise<NetworkStats[]>;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const toStorageMetric = (fileSystem: FileSystemSize): StorageMetric => {
  const total = Math.max(0, fileSystem.size);
  const used = Math.max(0, Math.min(total, fileSystem.used));
  const available = Math.max(0, fileSystem.available);

  return {
    mount: fileSystem.mount,
    total,
    used,
    available,
    percentUsed: total === 0 ? 0 : clampPercent((used / total) * 100),
  };
};

const findMount = (fileSystems: FileSystemSize[], mount: string) => {
  return fileSystems.find((fileSystem) => fileSystem.mount === mount) ?? null;
};

const asNumberOrNull = (value: number | null | undefined) => {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
};

const readSystemMetrics = async (client: SystemInformationClient): Promise<SystemMetrics> => {
  const [load, memory, fileSystems, defaultInterface] = await Promise.all([
    client.currentLoad(),
    client.mem(),
    client.fsSize(),
    client.networkInterfaceDefault().catch(() => ""),
  ]);

  const interfaceName = defaultInterface || null;
  const networkStats = interfaceName ? await client.networkStats(interfaceName).catch(() => []) : [];
  const selectedNetwork = networkStats[0];
  const externalMount = process.env.EXTERNAL_DISK_MOUNT?.trim();
  const systemMount = process.env.SYSTEM_DISK_MOUNT?.trim() || "/";
  const totalMemory = Math.max(0, memory.total);
  const availableMemory = Math.max(0, Math.min(totalMemory, memory.available));
  const usedMemory = Math.max(0, Math.min(totalMemory, memory.active));

  const network: NetworkMetric = {
    interfaceName,
    receivedBytes: Math.max(0, selectedNetwork?.rx_bytes ?? 0),
    transmittedBytes: Math.max(0, selectedNetwork?.tx_bytes ?? 0),
    receiveRate: asNumberOrNull(selectedNetwork?.rx_sec),
    transmitRate: asNumberOrNull(selectedNetwork?.tx_sec),
  };

  return {
    updatedAt: new Date().toISOString(),
    cpu: {
      used: clampPercent(load.currentLoad),
      idle: clampPercent(load.currentLoadIdle),
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      available: availableMemory,
      percentUsed: totalMemory === 0 ? 0 : clampPercent((usedMemory / totalMemory) * 100),
    },
    systemStorage: findMount(fileSystems, systemMount) ? toStorageMetric(findMount(fileSystems, systemMount)!) : null,
    externalStorage: externalMount && findMount(fileSystems, externalMount)
      ? toStorageMetric(findMount(fileSystems, externalMount)!)
      : null,
    network,
  };
};

const systemInformationClient = si as unknown as SystemInformationClient;

export const getSystemMetrics = () => readSystemMetrics(systemInformationClient);
