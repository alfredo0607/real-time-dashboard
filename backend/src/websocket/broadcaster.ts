import WebSocket from "ws";

export type MetricName =
  | "cpu"
  | "networkIn"
  | "networkOut"
  | "diskRead"
  | "diskWrite"
  | "memory";

export type DashboardMessage =
  | { type: "connected"; message: string }
  | { type: "metric"; name: MetricName; value: number; timestamp: string }
  | {
      type: "stream-event";
      eventName: "INSERT" | "MODIFY" | "REMOVE";
      tableName: string;
      keys: Record<string, unknown>;
      newImage?: Record<string, unknown>;
      oldImage?: Record<string, unknown>;
      timestamp: string;
    };

const HISTORY_SIZE = 60;

const clients = new Set<WebSocket>();
const metricsHistory = new Map<
  MetricName,
  Array<{ value: number; timestamp: string }>
>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
}

export function removeClient(ws: WebSocket): void {
  clients.delete(ws);
}

export function clientCount(): number {
  return clients.size;
}

export function sendSnapshot(ws: WebSocket): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  for (const [name, history] of metricsHistory) {
    for (const point of history) {
      ws.send(
        JSON.stringify({ type: "metric", name, value: point.value, timestamp: point.timestamp }),
      );
    }
  }
}

export function broadcast(message: DashboardMessage): void {
  if (message.type === "metric") {
    const history = metricsHistory.get(message.name) ?? [];
    history.push({ value: message.value, timestamp: message.timestamp });
    if (history.length > HISTORY_SIZE) history.shift();
    metricsHistory.set(message.name, history);
  }

  if (clients.size === 0) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
