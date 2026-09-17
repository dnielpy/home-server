"use client";

import { ErrorState } from "@/src/modules/common/components/error-state";
import { NetworkChart } from "@/src/modules/stats/components/network-chart";
import { NetworkHistoryChart } from "@/src/modules/stats/components/network-history-chart";
import { NetworkTotalCards } from "@/src/modules/stats/components/network-total-cards";
import { ResourceUsageSection } from "@/src/modules/stats/components/resource-usage-section";
import { StatsRefreshError } from "@/src/modules/stats/components/stats-refresh-error";
import { StatsPageHeader } from "@/src/modules/stats/components/stats-page-header";
import type { NetworkHistoryPoint, StatsLiveResponse } from "@home-server/contracts/stats";

type StatsViewProps = {
  liveStats: StatsLiveResponse | null;
  weeklyHistory: NetworkHistoryPoint[];
  error: string | null;
};

export const StatsView = ({ liveStats, weeklyHistory, error }: StatsViewProps) => {
  const metrics = liveStats?.current ?? null;

  if (!metrics) {
    return (
      <ErrorState
        title="No se pudieron cargar las métricas"
        description={error ?? "Comprueba el acceso del contenedor a la información del sistema."}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <StatsPageHeader updatedAt={metrics.updatedAt} />

      {error && <StatsRefreshError error={error} />}

      <ResourceUsageSection metrics={metrics} />

      <NetworkChart history={liveStats?.networkHistory ?? []} network={metrics.network} />
      <NetworkTotalCards network={metrics.network} />
      <NetworkHistoryChart history={weeklyHistory} />
    </div>
  );
};
