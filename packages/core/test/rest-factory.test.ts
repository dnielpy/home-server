import { afterEach, describe, expect, it, vi } from "vitest";
import { RestFactory } from "../src/http";

const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit): Response =>
  new Response(body === undefined ? undefined : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

afterEach(() => {
  RestFactory.reset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RestFactory", () => {
  it("combina URL, query y cabeceras con la precedencia documentada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "metric-1" }));
    vi.stubGlobal("fetch", fetchMock);
    RestFactory.configure({
      baseUrl: "https://api.example.test/v1/",
      defaultHeaders: { "X-Default": "default", "X-Winner": "default" },
      beforeRequest: async () => ({ headers: { "X-Hook": "hook", "X-Winner": "hook" } }),
    });
    const command = RestFactory.createPost<{ id: string }, { limit: number }>("stats", {
      headers: { "X-Command": "command", "X-Winner": "command" },
      buildRequest: (variables) => ({
        query: { limit: variables?.limit, ignored: undefined },
        body: variables,
        headers: { "X-Built": "built", "X-Winner": "built" },
      }),
    });

    await expect(command.execute({ limit: 5 })).resolves.toEqual({ success: true, data: { id: "metric-1" } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://api.example.test/v1/stats?limit=5");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Default": "default",
      "X-Command": "command",
      "X-Hook": "hook",
      "X-Built": "built",
      "X-Winner": "built",
    });
    expect(init.body).toBe('{"limit":5}');
  });

  it("deja que fetch asigne el boundary de FormData", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    RestFactory.configure({ baseUrl: "https://api.example.test/" });
    const body = new FormData();
    body.set("name", "disk");

    await RestFactory.createPost<{ ok: boolean }, FormData>("upload", {
      buildRequest: (value) => ({ body: value }),
    }).execute(body);

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.body).toBe(body);
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("normaliza respuestas HTTP y no permite que hooks defectuosos rompan la petición", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: ["period must be 7d"] }, 400));
    vi.stubGlobal("fetch", fetchMock);
    const afterResponse = vi.fn().mockRejectedValue(new Error("telemetry unavailable"));
    const onError = vi.fn().mockRejectedValue(new Error("reporter unavailable"));
    RestFactory.configure({ baseUrl: "https://api.example.test/", afterResponse, onError });

    const result = await RestFactory.createGet("stats/network-history").execute();

    expect(result).toMatchObject({
      success: false,
      error: { message: "period must be 7d" },
      errorDetails: { type: "NETWORK_ERROR", statusCode: 400 },
    });
    expect(afterResponse).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("devuelve un Result para errores de red y conserva el resultado final de 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    RestFactory.configure({ baseUrl: "https://api.example.test/" });
    await expect(RestFactory.createGet("stats").execute()).resolves.toMatchObject({
      success: false,
      error: { message: "connection refused" },
      errorDetails: { type: "UNKNOWN_ERROR" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "expired" }, 401)));
    await expect(RestFactory.createGet("stats").execute()).resolves.toMatchObject({
      success: false,
      errorDetails: { type: "AUTH_ERROR", statusCode: 401, shouldLogout: true },
    });
  });
});
