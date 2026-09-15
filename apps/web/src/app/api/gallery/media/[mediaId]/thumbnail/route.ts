import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await context.params;
  return proxyAuthenticatedApi(
    request,
    `/v1/gallery/media/${encodeURIComponent(mediaId)}/thumbnail${new URL(request.url).search}`,
  );
}
