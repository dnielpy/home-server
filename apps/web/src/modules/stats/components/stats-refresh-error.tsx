import { RefreshCw } from "lucide-react";

type StatsRefreshErrorProps = {
  error: string;
};

export const StatsRefreshError = ({ error }: StatsRefreshErrorProps) => {
  return (
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
      <RefreshCw aria-hidden="true" className="size-4" />
      La última actualización falló: {error}
    </div>
  );
};
