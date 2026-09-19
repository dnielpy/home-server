type LoadingBarProps = {
  progress?: number;
  indeterminate?: boolean;
};

export const LoadingBar = ({ progress = 0, indeterminate = false }: LoadingBarProps) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      aria-label="Cargando"
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuenow={indeterminate ? undefined : clampedProgress}
      className="app-loading-bar"
      role="progressbar"
    >
      <div
        className={`app-loading-bar__fill${indeterminate ? " app-loading-bar__fill--indeterminate" : ""}`}
        style={indeterminate ? undefined : { width: `${clampedProgress}%` }}
      />
    </div>
  );
};
