"use client";

import { AlertTriangle, CircleCheckBig, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/src/modules/common/components/card";
import { STATS_COLORS } from "@/src/modules/stats/constants";
import { MetricPieCard } from "@/src/modules/stats/components/metric-pie-card";
import { NetworkChart } from "@/src/modules/stats/components/network-chart";
import { NetworkHistoryChart } from "@/src/modules/stats/components/network-history-chart";
import { NetworkTotalCards } from "@/src/modules/stats/components/network-total-cards";
import { StorageMetricCard } from "@/src/modules/stats/components/storage-metric-card";
import type { NetworkHistoryPoint, StatsLiveResponse } from "@home-server/contracts/stats";
import { formatBytes, formatPercent } from "@/src/modules/stats/utils/format";

type StatsViewProps = {
  liveStats: StatsLiveResponse | null;
  weeklyHistory: NetworkHistoryPoint[];
  error: string | null;
};

export const StatsView = ({ liveStats, weeklyHistory, error }: StatsViewProps) => {
  const metrics = liveStats?.current ?? null;

  if (!metrics) {
    return (
      <Card className="mx-auto max-w-2xl rounded-2xl border-amber-500/30 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertTriangle aria-hidden="true" className="mx-auto size-8 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold">No se pudieron cargar las métricas</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Comprueba el acceso del contenedor a la información del sistema."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Servidor Ubuntu</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Estadísticas del sistema</h1>
          <p className="mt-2 text-sm text-muted-foreground">Uso de recursos y tráfico de la interfaz de red del host.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <CircleCheckBig aria-hidden="true" className="size-4 text-emerald-500" />
          Actualizado {new Date(metrics.updatedAt).toLocaleTimeString("es-ES")}
        </div>
      </section>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <RefreshCw aria-hidden="true" className="size-4" />
          La última actualización falló: {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Uso de recursos">
        <MetricPieCard
          title="CPU"
          description="Carga del procesador"
          percentage={metrics.cpu.used}
          segments={metrics.cpu.used === null ? [] : [
            { name: "En uso", value: metrics.cpu.used, color: STATS_COLORS.cpu },
            { name: "Inactiva", value: metrics.cpu.idle ?? 0, color: STATS_COLORS.idle },
          ]}
          detail={metrics.cpu.used === null ? "" : `${formatPercent(metrics.cpu.used)} de carga actual`}
        />
        <MetricPieCard
          title="Memoria RAM"
          description="Memoria activa del sistema"
          percentage={metrics.memory.percentUsed}
          segments={[
            { name: "Usada", value: metrics.memory.percentUsed, color: STATS_COLORS.used },
            { name: "Disponible", value: 100 - metrics.memory.percentUsed, color: STATS_COLORS.available },
          ]}
          detail={`${formatBytes(metrics.memory.used)} usados de ${formatBytes(metrics.memory.total)}`}
        />
        <StorageMetricCard title="Disco del sistema" storage={metrics.systemStorage} unavailableMessage="No se pudo leer el sistema de archivos raíz del host." />
        <StorageMetricCard title="Disco externo" storage={metrics.externalStorage} unavailableMessage="El montaje EXTERNAL_DISK_MOUNT no está disponible." />
      </section>

      <div className="mt-5"><NetworkChart history={liveStats?.networkHistory ?? []} network={metrics.network} /></div>
      <div className="mt-5"><NetworkTotalCards network={metrics.network} /></div>
      <div className="mt-5"><NetworkHistoryChart history={weeklyHistory} /></div>
    </div>
  );
};
