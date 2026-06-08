"use client";

import type { StreamEvent } from "@/types";

interface Props {
  events: StreamEvent[];
}

const eventBadge: Record<string, string> = {
  INSERT: "bg-green-100 text-green-700",
  MODIFY: "bg-yellow-100 text-yellow-700",
  REMOVE: "bg-red-100 text-red-700",
};

export function StreamEventsTable({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        Sin eventos de DynamoDB Streams aún...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="pb-2 pr-4">Evento</th>
            <th className="pb-2 pr-4">Tabla</th>
            <th className="pb-2 pr-4">Keys</th>
            <th className="pb-2 pr-4">Datos</th>
            <th className="pb-2">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[...events].reverse().map((evt, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="py-2 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${eventBadge[evt.eventName] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {evt.eventName}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                {evt.tableName}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-600">
                {JSON.stringify(evt.keys)}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-500 max-w-xs truncate">
                {evt.newImage ? JSON.stringify(evt.newImage) : "—"}
              </td>
              <td className="py-2 text-xs text-gray-400">
                {new Date(evt.timestamp).toLocaleTimeString("es-MX")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
