import { Activity, CircleCheck, Gauge, ListTodo } from "lucide-react";
import type { DownloadStats } from "@home-server/contracts/downloads";
import { formatSpeed } from "../utils/format";

export const GlobalStats = ({ stats }: { stats: DownloadStats }) => {
  const items = [
    { label: "Velocidad", value: formatSpeed(stats.downloadSpeedBytesPerSecond), icon: Gauge },
    { label: "Activas", value: stats.active.toLocaleString("es"), icon: Activity },
    { label: "En espera", value: stats.waiting.toLocaleString("es"), icon: ListTodo },
    { label: "Finalizadas", value: stats.stopped.toLocaleString("es"), icon: CircleCheck },
  ];
  return (
    <dl className="divide-border border-border bg-card grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border shadow-sm sm:grid-cols-4 sm:divide-y-0">
      {items.map(({ label, value, icon: Icon }) => (
        <div className="p-4" key={label}>
          <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <Icon className="size-3.5" />
            {label}
          </dt>
          <dd className="mt-2 text-xl font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
};
