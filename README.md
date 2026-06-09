# Real-Time Dashboard

Dashboard de monitoreo en tiempo real para infraestructura AWS. Visualiza métricas de EC2 (CPU, red, disco) y eventos de DynamoDB Streams sin necesidad de refrescar la página.

## El problema

Un equipo de operaciones necesita observar el estado de su plataforma AWS en todo momento: uso de CPU, tráfico de red, operaciones de disco y cambios en base de datos. Las soluciones típicas implican refrescar dashboards manualmente o pagar por herramientas de terceros. Este proyecto construye esa capacidad desde cero, con control total sobre los datos y la presentación.

## La solución

Un servidor WebSocket actúa como proxy inteligente entre el navegador y AWS. El cliente nunca habla directamente con AWS — solo mantiene una conexión WebSocket abierta y recibe datos en cuanto están disponibles.

```
Browser (Next.js)
     │
     │  WebSocket ws://
     ▼
┌────────────────────────────────────────────────┐
│  Backend  ·  Node.js + Express + TypeScript     │
│                                                │
│  ┌──────────────────┐   ┌────────────────────┐ │
│  │ CloudWatch Poller│   │ DynamoDB Streams   │ │
│  │   cada 60 s      │   │  listener ~1 s     │ │
│  └────────┬─────────┘   └─────────┬──────────┘ │
│           └──────────┬────────────┘            │
│                      ▼                         │
│             WebSocket Broadcaster              │
└────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
  CloudWatch Metrics        DynamoDB Streams
  (CPU, red, disco)         (INSERT/MODIFY/REMOVE)
```

### Flujo de reconexión del cliente

```
DISCONNECTED ──connect──► CONNECTING ──open──► CONNECTED
     ▲                                              │
     └─────────── error / close  (backoff) ◄────────┘
                  1s → 2s → 4s → 8s → 16s → 30s
```

## Estructura del repositorio

```
real-time-dashboard/
├── backend/        # API REST + WebSocket server (Express + TypeScript)
├── frontend/       # Dashboard web (Next.js 16 + React 19)
└── .github/
    └── workflows/  # CI/CD pipeline de despliegue
```

## Inicio rápido

### Prerrequisitos

- Node.js 20+
- Docker y Docker Compose
- Credenciales de AWS con acceso a CloudWatch y DynamoDB

### Levantar en desarrollo

```bash
# 1. Backend (Redis + API)
cd backend
cp .env.example .env          # completar variables de AWS y JWT
docker compose up -d redis    # levantar Redis
npm install
npm run dev                   # http://localhost:3000

# 2. Frontend (otra terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3001
```

El dashboard estará disponible en `http://localhost:3001`.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, React 19, Recharts, Tailwind CSS 4 |
| Backend | Express 5, TypeScript, ws, Zod |
| Base de datos | DynamoDB (producción), DynamoDB Local (desarrollo) |
| Caché / rate-limit | Redis + ioredis |
| Auth | JWT RS256 con refresh token rotation |
| AWS | CloudWatch Metrics, DynamoDB Streams |
| Infraestructura | Docker, EC2, IAM Roles |

## Documentación detallada

- [Backend](backend/README.md) — arquitectura del servidor, variables de entorno, API REST, WebSocket, despliegue
- [Frontend](frontend/README.md) — páginas, componentes, hook de WebSocket, autenticación, configuración

## Licencia

ISC
