interface MetricCardProps {
  title: string;
  value: number | null;
  unit: string;
  icon: string;
  description?: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  description,
  accentColor,
  bgColor,
  textColor,
}: MetricCardProps) {
  const formatted =
    value === null
      ? "—"
      : value >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : value % 1 === 0
          ? value.toString()
          : value.toFixed(2);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-surface-border transition-shadow hover:shadow-md sm:p-5"
    >
      {/* Top accent stripe */}
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between pt-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-xl font-bold tracking-tight sm:text-3xl" style={{ color: textColor }}>
            {formatted}
            {value !== null && (
              <span className="ml-1 text-sm font-normal text-gray-400 sm:text-base">
                {unit}
              </span>
            )}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          )}
        </div>

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-xl"
          style={{ backgroundColor: bgColor }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
