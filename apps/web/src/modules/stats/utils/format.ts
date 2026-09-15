export const formatBytes = (value: number, fractionDigits = 1) => {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const formatted = value / 1024 ** exponent;

  return `${formatted.toFixed(fractionDigits)} ${units[exponent]}`;
};

export const formatRate = (value: number | null) => {
  return value === null ? "Calculando…" : `${formatBytes(value)}/s`;
};

export const formatPercent = (value: number | null) => {
  if (value === null) return "—";
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`;
};
