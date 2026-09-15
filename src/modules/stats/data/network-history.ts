import type { NetworkHistoryPoint, NetworkMetric } from "@/src/modules/stats/types";

export const NETWORK_HISTORY_LIMIT = 600;

export const addNetworkHistoryPoint = (
  history: NetworkHistoryPoint[],
  network: NetworkMetric,
  timestamp = new Date(),
) => {
  const nextPoint: NetworkHistoryPoint = {
    time: timestamp.toLocaleTimeString("es-ES", { minute: "2-digit", second: "2-digit" }),
    received: network.receiveRate,
    transmitted: network.transmitRate,
  };

  return [...history, nextPoint].slice(-NETWORK_HISTORY_LIMIT);
};
