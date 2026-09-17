"use client";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, CardContent } from "@/src/modules/common/components/card";
import { PageSection } from "@/src/modules/common/components/page-section";
import type { NetworkMetric } from "@/src/modules/stats/types";
import { formatBytes } from "@/src/modules/stats/utils/format";

type NetworkTotalCardsProps = {
  network: NetworkMetric;
};

export const NetworkTotalCards = ({ network }: NetworkTotalCardsProps) => {
  return (
    <PageSection className="mt-5" aria-labelledby="network-total-title">
      <h2 id="network-total-title" className="sr-only">
        Tráfico total de red
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="rounded-2xl border-0 bg-sky-500/10 shadow-sm">
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-700 dark:text-sky-300">
              <ArrowDownToLine aria-hidden="true" className="size-4" /> Datos recibidos
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{formatBytes(network.receivedBytes)}</p>
            <p className="text-muted-foreground mt-1 text-sm">Total acumulado de descarga</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 bg-violet-500/10 shadow-sm">
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
              <ArrowUpFromLine aria-hidden="true" className="size-4" /> Datos enviados
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{formatBytes(network.transmittedBytes)}</p>
            <p className="text-muted-foreground mt-1 text-sm">Total acumulado de subida</p>
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
};
