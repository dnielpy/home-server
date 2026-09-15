import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const response = await fetch(new URL(`/v1/auth/profiles/${userId}/photo`, process.env.API_URL), {
    headers: { Accept: "image/*" },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Foto no encontrada." }, { status: response.status });
  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=60",
    },
  });
}
