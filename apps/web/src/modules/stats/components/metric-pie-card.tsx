"use client";

import { useId } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader } from "@/src/modules/common/components/card";
import type { PieSegment } from "@/src/modules/stats/types";
import { formatPercent } from "@/src/modules/stats/utils/format";

type MetricPieCardProps = {
  title: string;
  description: string;
  percentage: number | null;
  segments: PieSegment[];
  detail: string;
  unavailableMessage?: string;
};

export const MetricPieCard = ({ title, description, percentage, segments, detail, unavailableMessage }: MetricPieCardProps) => {
  const titleId = useId();
  const unavailable = unavailableMessage ?? (percentage === null ? "Calculando…" : undefined);

  return (
    <Card aria-labelledby={titleId} className="rounded-2xl shadow-sm">
      <CardHeader className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">{title}</h2>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {formatPercent(percentage)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-4">
        {unavailable ? (
          <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            {unavailable}
          </div>
        ) : (
          <>
            <div className="h-44" aria-label={`${title}: ${formatPercent(percentage)}`}>
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie data={segments} dataKey="value" innerRadius="61%" outerRadius="85%" paddingAngle={3} stroke="none">
                    {segments.map((segment) => <Cell key={segment.name} fill={segment.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => formatPercent(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {segments.map((segment) => (
                <span className="inline-flex items-center gap-1.5" key={segment.name}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.name}: {formatPercent(segment.value)}
                </span>
              ))}
            </div>
            <p className="mt-4 border-t pt-3 text-sm font-medium text-card-foreground">{detail}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
