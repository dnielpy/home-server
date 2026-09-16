import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";

export const POST = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  return proxyAuthenticatedApi(request, `/v1/downloads/${encodeURIComponent(id)}/resume`);
};
