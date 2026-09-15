import { MetricPieCard } from "@/src/modules/stats/components/metric-pie-card";
import { STATS_COLORS } from "@/src/modules/stats/constants";
import type { StorageMetric } from "@/src/modules/stats/types";
import { formatBytes } from "@/src/modules/stats/utils/format";

type StorageMetricCardProps = {
  title: string;
  storage: StorageMetric | null;
  unavailableMessage: string;
};

export const StorageMetricCard = ({ title, storage, unavailableMessage }: StorageMetricCardProps) => {
  return (
    <MetricPieCard
      title={title}
      description={storage ? `Montaje: ${storage.mount}` : "Almacenamiento"}
      percentage={storage?.percentUsed ?? null}
      segments={storage ? [
        { name: "Usado", value: storage.percentUsed, color: STATS_COLORS.used },
        { name: "Disponible", value: 100 - storage.percentUsed, color: STATS_COLORS.available },
      ] : []}
      detail={storage ? `${formatBytes(storage.used)} usados de ${formatBytes(storage.total)}` : ""}
      unavailableMessage={storage ? undefined : unavailableMessage}
    />
  );
};
