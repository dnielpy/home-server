import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/src/modules/auth/server/request-security";
import { proxyLocalTube } from "@/src/modules/localtube/server/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  return proxyLocalTube(request, "/v1/localtube/uploads", true);
}
