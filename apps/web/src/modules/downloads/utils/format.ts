const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value.toLocaleString("es", { maximumFractionDigits: value >= 100 || unit === 0 ? 0 : 1 })} ${BYTE_UNITS[unit]}`;
};

export const formatSpeed = (bytes: number) => `${formatBytes(bytes)}/s`;
export const formatPercent = (value: number) =>
  `${Math.min(100, Math.max(0, value)).toFixed(value > 0 && value < 1 ? 1 : 0)}%`;
export const formatEta = (seconds: number | null) => {
  if (seconds === null) return "Calculando…";
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} s restantes`;
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ""}${minutes % 60} min restantes`;
};
