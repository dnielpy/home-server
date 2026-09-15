import { afterEach, describe, expect, it, vi } from "vitest";

const { getSessionToken } = vi.hoisted(() => ({ getSessionToken: vi.fn() }));
vi.mock("@/src/modules/auth/server/session", () => ({ getSessionToken }));

import { proxyAuthenticatedApi } from "./api-proxy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("authenticated API proxy", () => {
  it("transmite sesión, rango y cabeceras de streaming al API", async () => {
    vi.stubEnv("API_URL", "http://api.internal:3001");
    getSessionToken.mockResolvedValue("session-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("media", {
        status: 206,
        headers: { "content-range": "bytes 2-5/10", "content-type": "video/mp4" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const request = { method: "GET", headers: { get: () => null }, body: null } as unknown as Request;
    const response = await proxyAuthenticatedApi(request, "/v1/gallery/media/a/content");
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer session-token");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
  });
});
