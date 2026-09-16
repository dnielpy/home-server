import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) => proxyAuthenticatedApi(request, "/v1/downloads");
export const POST = (request: Request) => proxyAuthenticatedApi(request, "/v1/downloads", true);
