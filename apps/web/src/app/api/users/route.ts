import { NextResponse } from "next/server";
import { userResponseSchema, usersResponseSchema } from "@home-server/contracts/users";
import { apiFetch } from "@/src/modules/auth/server/session";
import { hasValidOrigin } from "@/src/modules/auth/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapUserUrls<
  T extends { users?: Array<{ id: string; photoUrl: string | null }>; user?: { id: string; photoUrl: string | null } },
>(value: T) {
  const map = (user: { id: string; photoUrl: string | null }) => ({
    ...user,
    photoUrl: user.photoUrl ? `/api/users/${user.id}/photo` : null,
  });
  return {
    ...value,
    ...(value.users ? { users: value.users.map(map) } : {}),
    ...(value.user ? { user: map(value.user) } : {}),
  };
}

export async function GET() {
  const response = await apiFetch("/v1/users");
  const payload = await response.json().catch(() => ({ error: "No se pudieron cargar los usuarios." }));
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  return NextResponse.json(mapUserUrls(usersResponseSchema.parse(payload)));
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const response = await apiFetch("/v1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ error: "No se pudo crear el usuario." }));
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  return NextResponse.json(mapUserUrls(userResponseSchema.parse(payload)), { status: 201 });
}
