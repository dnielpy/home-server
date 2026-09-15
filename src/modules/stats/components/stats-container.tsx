"use server"

import { StatsView } from "@/src/modules/stats/components/stats-view";
import { getSystemMetrics } from "@/src/modules/stats/server/system-metrics";

export const StatsContainer = async () => {
  const data = await getSystemMetrics().catch(() => null);

  if (!data) {
    return <StatsView initialMetrics={null} />;
  }

  return <StatsView initialMetrics={data} />;
};
