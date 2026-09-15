import { afterEach, describe, expect, it, vi } from "vitest";
import { RestFactory } from "@home-server/core/http";
import { bootstrapRest } from "@/src/lib/http/bootstrap-rest";
import { createUser, deleteUser, getUsers, updateUser } from "@/src/lib/services/users";

const apiUser = {
  id: "9a6fc693-6f5e-4b24-8f51-f2d898efe5d6",
  name: "María",
  photoUrl: "users/maria/photo.webp",
  isAdmin: false,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
};

afterEach(() => {
  RestFactory.reset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("users service", () => {
  it("centraliza el CRUD contra Nest y adapta la URL de foto para el navegador", async () => {
    vi.stubEnv("API_URL", "http://api.internal:3001");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [apiUser] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: apiUser }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: apiUser }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: apiUser }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    bootstrapRest();

    await expect(getUsers()).resolves.toMatchObject({
      success: true,
      data: [
        {
          ...apiUser,
          photoUrl: `/api/users/${apiUser.id}/photo?v=${encodeURIComponent(apiUser.updatedAt)}`,
        },
      ],
    });
    await expect(createUser({ name: "María", password: "password-segura" })).resolves.toMatchObject({ success: true });
    await expect(updateUser(apiUser.id, { name: "María 2", removePhoto: true })).resolves.toMatchObject({
      success: true,
    });
    await expect(deleteUser(apiUser.id)).resolves.toMatchObject({ success: true });

    expect(fetchMock.mock.calls.map(([url]) => url.toString())).toEqual([
      "http://api.internal:3001/v1/users",
      "http://api.internal:3001/v1/users",
      `http://api.internal:3001/v1/users/${apiUser.id}`,
      `http://api.internal:3001/v1/users/${apiUser.id}`,
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(["GET", "POST", "PATCH", "DELETE"]);
  });
});
