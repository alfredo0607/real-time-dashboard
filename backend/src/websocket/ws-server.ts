import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import { addClient, removeClient } from "./broadcaster";

export function initWebSocketServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    console.log(`WS client connected [${ip}] — total: ${wss.clients.size}`);

    addClient(ws);

    ws.send(
      JSON.stringify({ type: "connected", message: "Dashboard stream connected" }),
    );

    ws.on("close", () => {
      removeClient(ws);
      console.log(`WS client disconnected — total: ${wss.clients.size}`);
    });

    ws.on("error", (err) => {
      console.error("WS client error:", err.message);
      removeClient(ws);
    });
  });

  console.log("✓ WebSocket server ready at /ws");
}
