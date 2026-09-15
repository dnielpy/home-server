import { NextResponse } from "next/server";
import { loginRequestSchema, loginResponseSchema } from "@home-server/contracts/users";
import { SESSION_COOKIE } from "@/src/modules/auth/server/session";
import { hasValidOrigin } from "@/src/modules/auth/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  const parsed = loginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Introduce tu usuario y contraseña." }, { status: 400 });

  const response = await fetch(new URL("/v1/auth/login", process.env.API_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });
  if (!response.ok)
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: response.status === 401 ? 401 : 500 },
    );
  const result = loginResponseSchema.safeParse(await response.json());
  if (!result.success)
    return NextResponse.json({ error: "La respuesta de autenticación no es válida." }, { status: 502 });

  const nextResponse = NextResponse.json({ user: result.data.user });
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const secure = forwardedProtocol ? forwardedProtocol === "https" : new URL(request.url).protocol === "https:";
  nextResponse.cookies.set(SESSION_COOKIE, result.data.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    priority: "high",
  });
  return nextResponse;
}
