"use client";

import { ChartNoAxesCombined } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader } from "@/src/modules/common/components/card";
import type { NetworkHistoryPoint } from "@home-server/contracts/stats";
import { formatBytes, formatRate } from "@/src/modules/stats/utils/format";

type NetworkHistoryChartProps = {
  history: NetworkHistoryPoint[];
};

const formatTimestamp = (value: string) => {
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

export const NetworkHistoryChart = ({ history }: NetworkHistoryChartProps) => {
  return (
    <Card aria-labelledby="network-history-title" className="rounded-2xl shadow-sm">
      <CardHeader className="p-5 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="network-history-title" className="flex items-center gap-2 text-base font-semibold">
              <ChartNoAxesCombined aria-hidden="true" className="text-primary size-4" />
              Tráfico de red · últimos 7 días
            </h2>
            <CardDescription className="mt-1">
              Promedio de descarga y subida por intervalos de 15 minutos.
            </CardDescription>
          </div>
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs">7 días</span>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-64 sm:h-72" aria-label="Gráfica semanal de velocidad de red">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={history} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
              <XAxis
                dataKey="timestamp"
                minTickGap={44}
                tickFormatter={formatTimestamp}
                stroke="currentColor"
                className="text-muted-foreground"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatBytes(Number(value), 0)}
                stroke="currentColor"
                className="text-muted-foreground"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                labelFormatter={(value) => new Date(String(value)).toLocaleString("es-ES")}
                formatter={(value: unknown) => formatRate(Number(value ?? 0))}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="received"
                name="Descarga"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="transmitted"
                name="Subida"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
