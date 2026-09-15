import { NextResponse } from "next/server";
import { userResponseSchema } from "@home-server/contracts/users";
import { apiFetch } from "@/src/modules/auth/server/session";
import { hasValidOrigin } from "@/src/modules/auth/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ userId: string }> };

const mapUser = (payload: { user: { id: string; photoUrl: string | null } }) => ({
  ...payload,
  user: { ...payload.user, photoUrl: payload.user.photoUrl ? `/api/users/${payload.user.id}/photo` : null },
});

export async function PATCH(request: Request, context: Context) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  const { userId } = await context.params;
  const response = await apiFetch(`/v1/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json().catch(() => null)),
  });
  const payload = await response.json().catch(() => ({ error: "No se pudo actualizar el usuario." }));
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  return NextResponse.json(mapUser(userResponseSchema.parse(payload)));
}

export async function DELETE(request: Request, context: Context) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  const { userId } = await context.params;
  const response = await apiFetch(`/v1/users/${userId}`, { method: "DELETE" });
  const payload = await response.json().catch(() => ({ error: "No se pudo eliminar el usuario." }));
  return NextResponse.json(payload, { status: response.status });
}
