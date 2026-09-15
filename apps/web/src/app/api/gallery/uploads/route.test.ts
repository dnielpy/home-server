import { describe, expect, it, vi } from "vitest";

const { hasValidOrigin, proxyAuthenticatedApi } = vi.hoisted(() => ({
  hasValidOrigin: vi.fn(),
  proxyAuthenticatedApi: vi.fn(),
}));
vi.mock("@/src/modules/auth/server/request-security", () => ({ hasValidOrigin }));
vi.mock("@/src/modules/auth/server/api-proxy", () => ({ proxyAuthenticatedApi }));

import { POST } from "./route";

describe("Gallery upload BFF", () => {
  it("rechaza un origen inválido antes de reenviar la carga", async () => {
    hasValidOrigin.mockReturnValue(false);
    const response = await POST(new Request("http://web/api/gallery/uploads", { method: "POST", body: "x" }));
    expect(response.status).toBe(403);
    expect(proxyAuthenticatedApi).not.toHaveBeenCalled();
  });
});
