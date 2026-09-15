import { NextResponse } from "next/server";
import { apiFetch, getSessionToken, SESSION_COOKIE } from "@/src/modules/auth/server/session";
import { hasValidOrigin } from "@/src/modules/auth/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  const token = await getSessionToken();
  if (token) await apiFetch("/v1/auth/session", { method: "DELETE" }, token).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
