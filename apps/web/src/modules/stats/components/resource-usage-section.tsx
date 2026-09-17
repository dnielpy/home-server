import { MetricPieCard } from "@/src/modules/stats/components/metric-pie-card";
import { StorageMetricCard } from "@/src/modules/stats/components/storage-metric-card";
import { STATS_COLORS } from "@/src/modules/stats/constants";
import type { SystemMetrics } from "@home-server/contracts/stats";
import { formatBytes, formatPercent } from "@/src/modules/stats/utils/format";
import { PageSection } from "@/src/modules/common/components/page-section";

type ResourceUsageSectionProps = {
  metrics: SystemMetrics;
};

export const ResourceUsageSection = ({ metrics }: ResourceUsageSectionProps) => {
  return (
    <PageSection className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Uso de recursos">
      <MetricPieCard
        title="CPU"
        description="Carga del procesador"
        percentage={metrics.cpu.used}
        segments={
          metrics.cpu.used === null
            ? []
            : [
                { name: "En uso", value: metrics.cpu.used, color: STATS_COLORS.cpu },
                { name: "Inactiva", value: metrics.cpu.idle ?? 0, color: STATS_COLORS.idle },
              ]
        }
        detail={metrics.cpu.used === null ? "" : `${formatPercent(metrics.cpu.used)} de carga actual`}
      />
      <MetricPieCard
        title="Memoria RAM"
        description="Memoria activa del sistema"
        percentage={metrics.memory.percentUsed}
        segments={[
          { name: "Usada", value: metrics.memory.percentUsed, color: STATS_COLORS.used },
          { name: "Disponible", value: 100 - metrics.memory.percentUsed, color: STATS_COLORS.available },
        ]}
        detail={`${formatBytes(metrics.memory.used)} usados de ${formatBytes(metrics.memory.total)}`}
      />
      <StorageMetricCard
        title="Disco del sistema"
        storage={metrics.systemStorage}
        unavailableMessage="No se pudo leer el sistema de archivos raíz del host."
      />
      <StorageMetricCard
        title="Disco externo"
        storage={metrics.externalStorage}
        unavailableMessage="El montaje EXTERNAL_DISK_MOUNT no está disponible."
      />
    </PageSection>
  );
};
