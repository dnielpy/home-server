import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkHistoryResponse, StatsLiveResponse } from "@home-server/contracts/stats";

const { getLiveStats, getWeeklyNetworkHistory } = vi.hoisted(() => ({
  getLiveStats: vi.fn(),
  getWeeklyNetworkHistory: vi.fn(),
}));

vi.mock("@/src/lib/services/stats", () => ({ getLiveStats, getWeeklyNetworkHistory }));

import { useStatsPolling } from "./use-stats-polling";

const live: StatsLiveResponse = {
  current: {
    updatedAt: "2026-01-01T00:00:00.000Z",
    cpu: { used: 1, idle: 99 },
    memory: { total: 10, used: 1, available: 9, percentUsed: 10 },
    systemStorage: null,
    externalStorage: null,
    network: { interfaceName: "eth0", receivedBytes: 0, transmittedBytes: 0, receiveRate: null, transmitRate: null },
  },
  networkHistory: [],
};
const history: NetworkHistoryResponse = { period: "7d", intervalMinutes: 15, points: [] };

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useStatsPolling", () => {
  it("inicia ambas lecturas y evita solapar el polling vivo", async () => {
    vi.useFakeTimers();
    let resolveLive: (value: { success: true; data: StatsLiveResponse }) => void = () => undefined;
    getLiveStats.mockReturnValue(
      new Promise((resolve) => {
        resolveLive = resolve;
      }),
    );
    getWeeklyNetworkHistory.mockResolvedValue({ success: true, data: history });

    const { result, unmount } = renderHook(() =>
      useStatsPolling({
        initialLiveStats: null,
        initialWeeklyHistory: [],
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getLiveStats).toHaveBeenCalledTimes(1);
    expect(getWeeklyNetworkHistory).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(getLiveStats).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLive({ success: true, data: live });
    });
    expect(result.current.liveStats).toEqual(live);
    unmount();
  });
});
