import { proxyLocalTube } from "@/src/modules/localtube/server/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  const url = new URL(request.url);
  return proxyLocalTube(request, `/v1/localtube/videos/${encodeURIComponent(videoId)}/stream${url.search}`);
}

export async function HEAD(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  const url = new URL(request.url);
  return proxyLocalTube(request, `/v1/localtube/videos/${encodeURIComponent(videoId)}/stream${url.search}`);
}
