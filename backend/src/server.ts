import { app } from "./app";
import { env } from "./config/env";
import { connectRedis } from "./config/redis";
import { connectDatabase } from "./config/database";
import { initWebSocketServer } from "./websocket/ws-server";
import { startCloudWatchPoller, stopCloudWatchPoller } from "./services/cloudwatch.service";
import { startDynamoStreamsListener, stopDynamoStreamsListener } from "./services/dynamo-streams.service";

async function bootstrap(): Promise<void> {
  await connectRedis();
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`✓ Server running on http://localhost:${env.PORT}`);
    console.log(`✓ Docs available at http://localhost:${env.PORT}/api/docs`);
    console.log(`✓ WebSocket available at ws://localhost:${env.PORT}/ws`);
    console.log(`✓ Cors available at ${env.cors.origins.join(", ")}`);
    console.log(`  Environment: ${env.NODE_ENV}`);
  });

  initWebSocketServer(server);
  startCloudWatchPoller();
  await startDynamoStreamsListener();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    stopCloudWatchPoller();
    stopDynamoStreamsListener();
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
