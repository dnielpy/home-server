import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const HEAD = (request: Request) => proxyAuthenticatedApi(request, `/v1/fast/ping${new URL(request.url).search}`);
