import { afterEach, describe, expect, it, vi } from "vitest";
import { RestFactory } from "@home-server/core/http";
import { bootstrapRest } from "@/src/lib/http/bootstrap-rest";
import { getLiveStats, getWeeklyNetworkHistory } from "@/src/lib/services/stats";

afterEach(() => {
  RestFactory.reset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("stats service", () => {
  it("llama directamente a Nest con no-store y conserva los contratos", async () => {
    vi.stubEnv("API_URL", "http://api.internal:3001");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ current: {}, networkHistory: [] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ period: "7d", intervalMinutes: 15, points: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    bootstrapRest();

    await expect(getLiveStats()).resolves.toMatchObject({ success: true, data: { networkHistory: [] } });
    await expect(getWeeklyNetworkHistory()).resolves.toMatchObject({ success: true, data: { period: "7d", points: [] } });

    expect(fetchMock.mock.calls[0][0].toString()).toBe("http://api.internal:3001/v1/stats/live");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    expect(fetchMock.mock.calls[1][0].toString()).toBe("http://api.internal:3001/v1/stats/network-history?period=7d");
  });
});
