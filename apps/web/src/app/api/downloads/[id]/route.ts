import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";

export const DELETE = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  return proxyAuthenticatedApi(request, `/v1/downloads/${encodeURIComponent(id)}`);
};
