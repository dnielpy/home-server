"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveStats, getWeeklyNetworkHistory } from "@/src/lib/services/stats";
import type { NetworkHistoryPoint, StatsLiveResponse } from "@home-server/contracts/stats";

const LIVE_POLL_INTERVAL_MS = 5_000;
const HISTORY_POLL_INTERVAL_MS = 15 * 60 * 1_000;

type UseStatsPollingInput = {
  initialLiveStats: StatsLiveResponse | null;
  initialWeeklyHistory: NetworkHistoryPoint[];
};

const unknownErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useStatsPolling = ({ initialLiveStats, initialWeeklyHistory }: UseStatsPollingInput) => {
  const [liveStats, setLiveStats] = useState(initialLiveStats);
  const [weeklyHistory, setWeeklyHistory] = useState(initialWeeklyHistory);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const active = useRef(true);
  const liveRequestInFlight = useRef(false);
  const historyRequestInFlight = useRef(false);

  const refreshLiveStats = useCallback(async () => {
    if (liveRequestInFlight.current) return;
    liveRequestInFlight.current = true;
    try {
      const result = await getLiveStats();
      if (!active.current) return;
      if (result.success) {
        setLiveStats(result.data);
        setLiveError(null);
      } else {
        setLiveError(result.error.message);
      }
    } catch (error) {
      if (active.current) setLiveError(unknownErrorMessage(error, "No fue posible actualizar las métricas."));
    } finally {
      liveRequestInFlight.current = false;
    }
  }, []);

  const refreshWeeklyHistory = useCallback(async () => {
    if (historyRequestInFlight.current) return;
    historyRequestInFlight.current = true;
    try {
      const result = await getWeeklyNetworkHistory();
      if (!active.current) return;
      if (result.success) {
        setWeeklyHistory(result.data.points);
        setHistoryError(null);
      } else {
        setHistoryError(result.error.message);
      }
    } catch (error) {
      if (active.current) setHistoryError(unknownErrorMessage(error, "No fue posible cargar el histórico semanal."));
    } finally {
      historyRequestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    active.current = true;
    const initialRefresh = window.setTimeout(() => void refreshLiveStats(), 0);
    const interval = window.setInterval(() => void refreshLiveStats(), LIVE_POLL_INTERVAL_MS);
    return () => {
      active.current = false;
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refreshLiveStats]);

  useEffect(() => {
    active.current = true;
    const initialRefresh = window.setTimeout(() => void refreshWeeklyHistory(), 0);
    const interval = window.setInterval(() => void refreshWeeklyHistory(), HISTORY_POLL_INTERVAL_MS);
    return () => {
      active.current = false;
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refreshWeeklyHistory]);

  return { liveStats, weeklyHistory, error: liveError ?? historyError };
};
