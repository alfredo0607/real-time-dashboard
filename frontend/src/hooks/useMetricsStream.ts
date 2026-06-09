"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  MetricName,
  MetricPoint,
  MetricsBuffer,
  WsStatus,
  StreamEvent,
} from "@/types";

const BUFFER_SIZE = 60;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

const emptyBuffer = (): MetricsBuffer => ({
  cpu: [],
  networkIn: [],
  networkOut: [],
  diskRead: [],
  diskWrite: [],
  memory: [],
});

type WsMessage =
  | { type: "connected" }
  | { type: "metric"; name: MetricName; value: number; timestamp: string }
  | StreamEvent;

export function useMetricsStream(wsUrl: string) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [metrics, setMetrics] = useState<MetricsBuffer>(emptyBuffer);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      retryCountRef.current = 0;
      setStatus("connected");
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(evt.data) as WsMessage;

        if (msg.type === "metric") {
          const point: MetricPoint = {
            timestamp: msg.timestamp,
            value: msg.value,
          };
          setMetrics((prev) => ({
            ...prev,
            [msg.name]: [...prev[msg.name].slice(-(BUFFER_SIZE - 1)), point],
          }));
        } else if (msg.type === "stream-event") {
          setStreamEvents((prev) => [...prev.slice(-49), msg]);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setStatus("disconnected");

      const delay =
        BACKOFF_MS[Math.min(retryCountRef.current, BACKOFF_MS.length - 1)];
      retryCountRef.current++;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, metrics, streamEvents };
}
