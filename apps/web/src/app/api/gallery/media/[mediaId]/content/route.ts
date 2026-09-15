import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiPath = async (context: { params: Promise<{ mediaId: string }> }, request: Request) => {
  const { mediaId } = await context.params;
  return `/v1/gallery/media/${encodeURIComponent(mediaId)}/content${new URL(request.url).search}`;
};

export async function GET(request: Request, context: { params: Promise<{ mediaId: string }> }) {
  return proxyAuthenticatedApi(request, await apiPath(context, request));
}

export async function HEAD(request: Request, context: { params: Promise<{ mediaId: string }> }) {
  return proxyAuthenticatedApi(request, await apiPath(context, request));
}
