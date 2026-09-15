import type { MetricsErrorPayload, SystemMetrics } from "@/src/modules/stats/types";

type StatsSubscription = {
  onData: (metrics: SystemMetrics) => void;
  onError: (message: string) => void;
};

const isSystemMetrics = (payload: unknown): payload is SystemMetrics => {
  return typeof payload === "object" && payload !== null && "updatedAt" in payload && "network" in payload;
};

const fetchStats = async (signal: AbortSignal) => {
  const response = await fetch("/api/stats", { cache: "no-store", signal });
  const payload = (await response.json()) as SystemMetrics | MetricsErrorPayload;

  if (!response.ok || !isSystemMetrics(payload)) {
    throw new Error("error" in payload ? payload.error : "No fue posible actualizar las métricas.");
  }

  return payload;
};

export const subscribeToStats = ({ onData, onError }: StatsSubscription) => {
  const controller = new AbortController();
  let active = true;

  const refresh = async () => {
    try {
      const metrics = await fetchStats(controller.signal);
      if (active) onData(metrics);
    } catch (error) {
      if (active && !(error instanceof DOMException && error.name === "AbortError")) {
        onError(error instanceof Error ? error.message : "No fue posible actualizar las métricas.");
      }
    }
  };

  const interval = window.setInterval(() => void refresh(), 1000);

  return () => {
    active = false;
    controller.abort();
    window.clearInterval(interval);
  };
};
