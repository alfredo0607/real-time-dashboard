import WebSocket from "ws";

export type MetricName = "cpu" | "networkIn" | "networkOut" | "diskRead" | "diskWrite" | "memory";

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

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
}

export function removeClient(ws: WebSocket): void {
  clients.delete(ws);
}

export function clientCount(): number {
  return clients.size;
}

export function broadcast(message: DashboardMessage): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
