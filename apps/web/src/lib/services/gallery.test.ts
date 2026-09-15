import { afterEach, describe, expect, it, vi } from "vitest";
import { RestFactory } from "@home-server/core/http";
import { bootstrapRest } from "@/src/lib/http/bootstrap-rest";
import { getGalleryAlbums, getGalleryMedia } from "./gallery";

afterEach(() => {
  RestFactory.reset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Gallery service", () => {
  it("consume los contratos de Nest sin exponer rutas de archivos", async () => {
    vi.stubEnv("API_URL", "http://api.internal:3001");
    const image = {
      id: "a".repeat(32),
      kind: "image",
      fileName: "foto.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 800,
      modifiedAt: "2026-01-01T00:00:00.000Z",
      size: 123,
      durationSeconds: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [image], nextCursor: "next" }), {
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ albums: [{ id: "b".repeat(32), name: "Familia", itemCount: 1, cover: image }] }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    bootstrapRest();

    await expect(getGalleryMedia("album-1")).resolves.toMatchObject({ success: true, data: { nextCursor: "next" } });
    await expect(getGalleryAlbums()).resolves.toMatchObject({ success: true, data: [{ name: "Familia" }] });
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "http://api.internal:3001/v1/gallery/media?albumId=album-1&limit=60",
    );
    expect(fetchMock.mock.calls[1][0].toString()).toBe("http://api.internal:3001/v1/gallery/albums");
  });
});
