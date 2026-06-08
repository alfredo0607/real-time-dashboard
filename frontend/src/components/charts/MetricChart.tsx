"use client";

import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  Area,
} from "recharts";
import type { MetricPoint } from "@/types";

interface MetricChartProps {
  data: MetricPoint[];
  type?: "line" | "area";
  color?: string;
  unit?: string;
  height?: number;
  emptyMessage?: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function MetricChart({
  data,
  type = "line",
  color = "#3B82F6",
  unit = "",
  height = 200,
  emptyMessage = "Sin datos aún — esperando métricas...",
}: MetricChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-gray-400"
      >
        {emptyMessage}
      </div>
    );
  }

  const chartData = data.map((p) => ({
    value: p.value,
    time: formatTime(p.timestamp),
  }));

  const fillColor = `${color}22`;

  const commonProps = {
    data: chartData,
    margin: { top: 4, right: 8, left: 0, bottom: 0 },
  };

  const axisProps = {
    tick: { fontSize: 11, fill: "#9CA3AF" },
    axisLine: false,
    tickLine: false,
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
          <YAxis
            {...axisProps}
            unit={unit}
            width={unit ? 48 : 36}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [`${Number(v).toFixed(2)}${unit}`, "Valor"]}
            labelStyle={{ color: "#374151" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={fillColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
          <YAxis
            {...axisProps}
            unit={unit}
            width={unit ? 48 : 36}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [`${Number(v).toFixed(2)}${unit}`, "Valor"]}
            labelStyle={{ color: "#374151" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
