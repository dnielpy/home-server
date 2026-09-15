"use client";

import { ArrowDownToLine, ArrowUpFromLine, Network } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader } from "@/src/modules/common/components/card";
import type { NetworkHistoryPoint, NetworkMetric } from "@/src/modules/stats/types";
import { formatBytes, formatRate } from "@/src/modules/stats/utils/format";

type NetworkChartProps = {
  network: NetworkMetric;
  history: NetworkHistoryPoint[];
};

export const NetworkChart = ({ network, history }: NetworkChartProps) => {
  return (
    <Card aria-labelledby="network-title" className="rounded-2xl shadow-sm">
      <CardHeader className="p-5 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="network-title" className="flex items-center gap-2 text-base font-semibold">
              <Network aria-hidden="true" className="size-4 text-primary" />
              Tráfico de red
            </h2>
            <CardDescription className="mt-1">
              {network.interfaceName ? `Interfaz predeterminada: ${network.interfaceName}` : "No hay una interfaz de red predeterminada disponible."}
            </CardDescription>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1">Últimos 10 minutos</span>
            <span className="rounded-full bg-muted px-2.5 py-1">Actualiza cada 1 s</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-sky-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
              <ArrowDownToLine aria-hidden="true" className="size-3.5" /> Descarga actual
            </p>
            <p className="mt-1 text-xl font-bold">{formatRate(network.receiveRate)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total: {formatBytes(network.receivedBytes)}</p>
          </div>
          <div className="rounded-xl bg-violet-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <ArrowUpFromLine aria-hidden="true" className="size-3.5" /> Subida actual
            </p>
            <p className="mt-1 text-xl font-bold">{formatRate(network.transmitRate)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total: {formatBytes(network.transmittedBytes)}</p>
          </div>
        </div>
        <div className="mt-5 h-72" aria-label="Gráfica de velocidad de red">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={history} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
              <XAxis dataKey="time" minTickGap={28} stroke="currentColor" className="text-muted-foreground" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => formatBytes(Number(value), 0)} stroke="currentColor" className="text-muted-foreground" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(value: unknown) => formatRate(Number(value ?? 0))} />
              <Legend />
              <Line type="monotone" dataKey="received" name="Descarga" stroke="#0ea5e9" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="transmitted" name="Subida" stroke="#8b5cf6" strokeWidth={2.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
