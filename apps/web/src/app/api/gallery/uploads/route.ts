import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/src/modules/auth/server/request-security";
import { proxyAuthenticatedApi } from "@/src/modules/auth/server/api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  return proxyAuthenticatedApi(request, "/v1/gallery/uploads", true);
}
