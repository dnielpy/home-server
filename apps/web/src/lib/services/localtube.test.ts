import { afterEach, describe, expect, it, vi } from "vitest";
import { RestFactory } from "@home-server/core/http";
import { bootstrapRest } from "@/src/lib/http/bootstrap-rest";
import { getLocalTubeVideo, getLocalTubeVideos } from "@/src/lib/services/localtube";

afterEach(() => {
  RestFactory.reset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("LocalTube service", () => {
  it("llama a Nest con los contratos y parámetros de biblioteca", async () => {
    vi.stubEnv("API_URL", "http://api.internal:3001");
    const video = {
      id: "a".repeat(32),
      title: "Mi vídeo",
      duration: "1:02",
      modifiedAt: "2026-01-01T00:00:00.000Z",
      folder: "Biblioteca",
      size: 123,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [video], nextCursor: "next" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(video), { status: 200, headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    bootstrapRest();

    await expect(getLocalTubeVideos("mi vídeo", "cursor-value")).resolves.toMatchObject({
      success: true,
      data: { nextCursor: "next" },
    });
    await expect(getLocalTubeVideo(video.id)).resolves.toMatchObject({ success: true, data: { id: video.id } });

    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/v1/localtube/videos?q=mi+v%C3%ADdeo&cursor=cursor-value&limit=12",
    );
    expect(fetchMock.mock.calls[1][0].toString()).toBe(`http://api.internal:3001/v1/localtube/videos/${video.id}`);
  });
});
