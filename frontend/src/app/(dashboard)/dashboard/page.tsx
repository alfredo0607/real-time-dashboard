"use client";

import { useMetricsStream } from "@/hooks/useMetricsStream";
import { MetricChart } from "@/components/charts/MetricChart";
import { StreamEventsTable } from "@/components/charts/StreamEventsTable";
import { MetricCard } from "@/components/layout/MetricCard";
import type { MetricName, MetricPoint } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000/ws";

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  connected: {
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Conectado",
  },
  connecting: {
    dot: "bg-aws-orange animate-pulse",
    badge: "bg-aws-orange-pastel text-aws-dark ring-aws-orange/30",
    label: "Conectando...",
  },
  disconnected: {
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-700 ring-red-200",
    label: "Desconectado",
  },
};

function lastValue(points: MetricPoint[]): number | null {
  return points.length > 0 ? (points[points.length - 1]?.value ?? null) : null;
}

const METRIC_CONFIG: {
  key: MetricName;
  title: string;
  unit: string;
  icon: string;
  chartType: "line" | "area";
  chartColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  description: string;
}[] = [
  {
    key: "cpu",
    title: "CPU Utilization",
    unit: "%",
    icon: "🖥️",
    chartType: "line",
    chartColor: "#FF9900",
    accentColor: "#FF9900",
    bgColor: "#FFF4E6",
    textColor: "#CC7A00",
    description: "EC2 · promedio",
  },
  {
    key: "requests",
    title: "Request Count",
    unit: " req",
    icon: "📶",
    chartType: "area",
    chartColor: "#34D399",
    accentColor: "#34D399",
    bgColor: "#ECFDF5",
    textColor: "#059669",
    description: "ALB · suma 60s",
  },
  {
    key: "latency",
    title: "Latencia p95",
    unit: " s",
    icon: "⏱️",
    chartType: "line",
    chartColor: "#A78BFA",
    accentColor: "#A78BFA",
    bgColor: "#F5F3FF",
    textColor: "#7C3AED",
    description: "TargetResponseTime",
  },
  {
    key: "errors",
    title: "Errores 5XX",
    unit: "",
    icon: "🚨",
    chartType: "area",
    chartColor: "#F87171",
    accentColor: "#F87171",
    bgColor: "#FEF2F2",
    textColor: "#DC2626",
    description: "HTTPCode_ELB_5XX",
  },
];

export default function DashboardPage() {
  const { status, metrics, streamEvents } = useMetricsStream(WS_URL);
  const s = STATUS_STYLES[status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-aws-dark">
            Dashboard en tiempo real
          </h1>
          <p className="text-sm text-gray-500">
            CloudWatch · polling 60s &nbsp;·&nbsp; DynamoDB Streams · tiempo real
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${s.badge}`}
        >
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          {s.label}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {METRIC_CONFIG.map((m) => (
          <MetricCard
            key={m.key}
            title={m.title}
            value={lastValue(metrics[m.key])}
            unit={m.unit}
            icon={m.icon}
            description={m.description}
            accentColor={m.accentColor}
            bgColor={m.bgColor}
            textColor={m.textColor}
          />
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {METRIC_CONFIG.map((m) => (
          <div
            key={m.key}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-surface-border"
          >
            <div className="mb-4 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: m.chartColor }}
              />
              <h3 className="text-sm font-semibold text-gray-700">
                {m.icon} {m.title}
              </h3>
            </div>
            <MetricChart
              data={metrics[m.key]}
              type={m.chartType}
              color={m.chartColor}
              unit={m.unit}
              height={180}
            />
          </div>
        ))}
      </div>

      {/* DynamoDB Stream Events */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-surface-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-aws-orange-pastel text-sm">
              🔄
            </span>
            <h3 className="text-sm font-semibold text-gray-700">
              DynamoDB Stream Events
            </h3>
          </div>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-surface-border">
            {streamEvents.length} evento{streamEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
        <StreamEventsTable events={streamEvents} />
      </div>
    </div>
  );
}
