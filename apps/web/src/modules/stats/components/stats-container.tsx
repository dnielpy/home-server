"use client";

import { StatsView } from "@/src/modules/stats/components/stats-view";
import { useStatsPolling } from "@/src/modules/stats/hooks/use-stats-polling";
import type { NetworkHistoryPoint, StatsLiveResponse } from "@home-server/contracts/stats";

type StatsContainerProps = {
  initialLiveStats: StatsLiveResponse | null;
  initialWeeklyHistory: NetworkHistoryPoint[];
};

export const StatsContainer = ({ initialLiveStats, initialWeeklyHistory }: StatsContainerProps) => {
  const { liveStats, weeklyHistory, error } = useStatsPolling({
    initialLiveStats,
    initialWeeklyHistory,
  });

  return <StatsView error={error} liveStats={liveStats} weeklyHistory={weeklyHistory} />;
};
