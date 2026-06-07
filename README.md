# real-time-dashboard

Dashboard en Tiempo Real con React
Dashboard interactivo Next.js con WebSockets para métricas en vivo desde CloudWatch y DynamoDB Streams.


Problema

Un equipo de operaciones necesita monitorear métricas de su plataforma AWS en tiempo real (CPU, requests/s, errores, latencia p95) sin refrescar la página. Los datos vienen de CloudWatch y DynamoDB. La solución debe actualizar el dashboard automáticamente cada vez que hay nuevos datos.


Solución

Frontend Next.js con componentes de gráficos en tiempo real. WebSocket server (Node.js) que actúa como proxy entre el browser y las APIs de AWS: consulta CloudWatch Metrics cada 60 segundos y escucha DynamoDB Streams en tiempo real. El cliente usa un hook personalizado useMetricsStream que gestiona la conexión WebSocket, reconexión automática y el buffer de datos.

Browser (Next.js)
     │
     │ WebSocket (ws://)
     ▼
  ┌────────────────────────────────────────────────────┐
  │  WebSocket Server (Node.js)                        │
  │                                                    │
  │  ┌─────────────────┐    ┌──────────────────────┐   │
  │  │ CloudWatch      │    │  DynamoDB Streams    │   │
  │  │ Poller (60s)    │    │  Listener (real-time)│   │
  │  └────────┬────────┘    └──────────┬───────────┘   │
  │           │                        │                │
  │           └──────────┬─────────────┘                │
  │                      ▼                              │
  │             ┌─────────────────┐                     │
  │             │ Broadcast a     │                     │
  │             │ clientes WS     │                     │
  │             │ suscritos       │                     │
  │             └─────────────────┘                     │
  └────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
  ┌─────────────┐          ┌─────────────────┐
  │  CloudWatch │          │  DynamoDB       │
  │  Metrics    │          │  Streams        │
  │  (CPU, req, │          │  (nuevos items) │
  │   latencia) │          └─────────────────┘
  └─────────────┘

  Frontend State Machine (useMetricsStream):
  DISCONNECTED ──connect──▶ CONNECTING ──open──▶ CONNECTED
       ▲                                              │
       └──────────── error/close (backoff retry) ◀───┘



Implementación
1
Hook useMetricsStream — gestión del WebSocket en React
El hook gestiona el ciclo de vida completo de la conexión WebSocket: conectar, recibir datos, reconectar con exponential backoff (1s, 2s, 4s, 8s, max 30s) ante desconexiones. Mantiene un buffer circular de los últimos 60 puntos de datos por métrica para renderizar la gráfica. Cleanup en el useEffect garantiza que el socket se cierra cuando el componente se desmonta.

2
CloudWatch Metrics Poller (server-side)
El WebSocket server consulta CloudWatch GetMetricData cada 60 segundos para las métricas configuradas (CPU, RequestCount, TargetResponseTime, HTTPCode_ELB_5XX_Count). Usa el SDK v3 de AWS con IAM Role (sin credentials hardcodeadas). Los datos se normalizan y se brodacastean a todos los clientes WebSocket suscritos a esa métrica.

3
DynamoDB Streams — eventos en tiempo real
DynamoDB Streams captura cada INSERT/MODIFY/REMOVE en la tabla. El servidor usa el SDK para leer los stream records con getShardIterator + getRecords en polling (o con Kinesis Client Library para mayor robustez). Cada nuevo item se parsea y se brodacastea al dashboard en <1 segundo desde el evento original.

4
Renderizado de gráficas con Recharts
Los componentes de gráfica usan Recharts (LineChart, AreaChart). Son 'use client' en Next.js (interactivos). Cada punto de dato nuevo se añade al estado con setData(prev => [...prev.slice(-59), newPoint]) — mantiene los últimos 60 puntos y el componente re-renderiza solo la parte que cambia gracias al virtual DOM de React.


Tech Stack
Frontend

Next.js 16
React 19
TypeScript
Recharts
Tailwind CSS
WebSocket Server

Node.js 24.16.0
ws (WebSocket library)
TypeScript
AWS SDKs

@aws-sdk/client-cloudwatch
@aws-sdk/client-dynamodb-streams
Infraestructura

EC2 + Docker (WS server)
IAM Roles
