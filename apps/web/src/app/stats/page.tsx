import { StatsContainer } from "@/src/modules/stats/components/stats-container";
import { getLiveStats, getWeeklyNetworkHistory } from "@/src/lib/services/stats";

export const dynamic = "force-dynamic";

const StatsPage = async () => {
  const [liveResult, historyResult] = await Promise.all([getLiveStats(), getWeeklyNetworkHistory()]);

  return (
    <StatsContainer
      initialLiveStats={liveResult.success ? liveResult.data : null}
      initialWeeklyHistory={historyResult.success ? historyResult.data.points : []}
    />
  );
};

export default StatsPage;
