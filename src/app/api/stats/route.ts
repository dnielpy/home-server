import { NextResponse } from "next/server";
import { getSystemMetrics } from "@/src/modules/stats/server/system-metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async () => {
  try {
    return NextResponse.json(await getSystemMetrics(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible leer las métricas del host.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
};
