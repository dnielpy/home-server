import { proxyLocalTube } from "@/src/modules/localtube/server/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyLocalTube(request, `/v1/localtube/videos${url.search}`);
}
