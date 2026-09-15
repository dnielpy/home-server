import { NextResponse } from "next/server";
import { apiFetch } from "@/src/modules/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const response = await apiFetch(`/v1/users/${userId}/photo`);
  if (!response.ok) return NextResponse.json({ error: "Foto no encontrada." }, { status: response.status });
  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=60" },
  });
}
