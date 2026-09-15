import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyAuthenticatedApi(request, "/v1/gallery/albums");
}
