# Backend

Servidor Express + TypeScript que expone una API REST autenticada y un endpoint WebSocket. Actúa como proxy entre el navegador y AWS: consulta CloudWatch cada 60 segundos y escucha DynamoDB Streams en tiempo real, retransmitiendo los datos a todos los clientes conectados.

## Arquitectura

```
src/
├── server.ts               # Bootstrap: Redis, DynamoDB, WS, pollers, graceful shutdown
├── app.ts                  # Express middleware stack + registro de rutas
│
├── config/
│   ├── env.ts              # Variables de entorno validadas con Zod
│   ├── database.ts         # Cliente DynamoDB
│   ├── redis.ts            # Cliente Redis
│   └── jwt.ts              # Carga de claves RSA (RS256)
│
├── routes/
│   ├── auth.routes.ts      # /api/auth  — register, login, refresh, logout
│   └── users.routes.ts     # /api/users — perfil y listado (protegido)
│
├── controllers/
│   ├── auth.controller.ts
│   └── users.controller.ts
│
├── services/
│   ├── auth.service.ts             # Hashing, emisión y rotación de tokens
│   ├── cloudwatch.service.ts       # Polling de métricas EC2 (60 s)
│   ├── dynamo-streams.service.ts   # Listener de DynamoDB Streams (~1 s)
│   └── users.service.ts
│
├── middleware/
│   ├── authenticate.ts     # Valida JWT Bearer
│   ├── authorize.ts        # RBAC: admin / user / viewer
│   ├── validate.ts         # Validación con esquemas Zod
│   ├── rateLimiter.ts      # Rate limit global y específico de login (Redis)
│   └── errorHandler.ts     # Formateador centralizado de errores
│
├── repositories/
│   └── user.repository.ts  # CRUD sobre DynamoDB
│
├── websocket/
│   ├── ws-server.ts        # Inicialización del servidor WS en /ws
│   └── broadcaster.ts      # Broadcast JSON a clientes suscritos
│
├── models/
│   ├── auth.schemas.ts
│   ├── users.schemas.ts
│   └── user.model.ts
│
├── types/
│   └── index.ts            # JwtPayload, UserRole, interfaces compartidas
│
├── docs/
│   └── swagger.ts          # Configuración OpenAPI
│
└── utils/
    └── AppError.ts         # Error personalizado con statusCode
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores.

```bash
# Servidor
NODE_ENV=development
PORT=3000

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# DynamoDB
DYNAMODB_TABLE_USERS=Users
DYNAMODB_STREAM_TABLE=           # tabla con Streams habilitados

# CloudWatch
CW_EC2_INSTANCE_ID=i-xxxxxxxxx
CW_POLL_INTERVAL_MS=60000        # intervalo de polling en ms

# DynamoDB Streams
STREAMS_POLL_INTERVAL_MS=1000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (claves RSA en ./keys/)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=604800  # 7 días en segundos

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# CORS
CORS_ORIGIN=http://localhost:3001

# Logging
LOG_LEVEL=dev
```

### Generar claves RSA

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

## Inicio rápido

### Desarrollo local

```bash
# Levantar Redis
docker compose up -d redis

# Instalar dependencias y arrancar con live-reload
npm install
npm run dev
```

### Con Docker Compose completo

```bash
docker compose up --build
```

El servicio queda disponible en `http://localhost:3000`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con live-reload (`tsx watch`) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta `dist/server.js` (producción) |
| `npm run lint` | Type-check sin emitir (`tsc --noEmit`) |

## API REST

Base URL: `http://localhost:3000/api`

Documentación interactiva Swagger: `http://localhost:3000/api/docs`

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Crear cuenta |
| POST | `/auth/login` | No | Obtener access + refresh token |
| POST | `/auth/refresh` | No | Rotar tokens con refresh token |
| POST | `/auth/logout` | Bearer | Invalidar sesión |

### Usuarios

| Método | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| GET | `/users` | admin | Listar usuarios |
| GET | `/users/:id` | user | Obtener perfil |

### Formato de error

```json
{
  "status": "error",
  "message": "Descripción del error",
  "code": 401
}
```

## WebSocket

**Endpoint:** `ws://localhost:3000/ws`

No requiere autenticación para conectarse. El servidor emite dos tipos de mensajes:

### Mensaje de métrica (CloudWatch)

```json
{
  "type": "metric",
  "name": "CPUUtilization",
  "value": 34.7,
  "timestamp": "2026-06-08T14:00:00.000Z"
}
```

Nombres de métricas disponibles: `CPUUtilization`, `NetworkIn`, `NetworkOut`, `DiskReadBytes`, `DiskWriteBytes`.

### Mensaje de evento (DynamoDB Streams)

```json
{
  "type": "stream-event",
  "eventName": "INSERT",
  "tableName": "MyTable",
  "newImage": { "id": "abc123", "status": "active" },
  "timestamp": "2026-06-08T14:00:01.123Z"
}
```

`eventName` puede ser `INSERT`, `MODIFY` o `REMOVE`.

## Decisiones de diseño

**JWT RS256 con refresh rotation.** Las claves asimétricas permiten verificar tokens en servicios que solo conocen la clave pública. La rotación de refresh tokens limita la ventana de compromiso.

**Rate limiting en Redis.** El almacenamiento del estado del rate-limiter en Redis en lugar de en memoria permite escalar horizontalmente el API sin perder la cuenta de peticiones por IP.

**Pollers desacoplados del servidor HTTP.** `startCloudWatchPoller()` y `startDynamoStreamsPoller()` se inician y detienen de forma independiente. El graceful shutdown llama a sus funciones de parada antes de cerrar el servidor HTTP, evitando peticiones huérfanas a AWS.

**Validación con Zod en la frontera.** Todo input externo (cuerpo de request, variables de entorno) pasa por esquemas Zod. El resto del código puede confiar en los tipos TypeScript sin guardias adicionales.

## Docker

El `Dockerfile` usa multi-stage build:

1. **builder** — instala todas las dependencias y compila TypeScript
2. **runtime** — imagen `node:24-slim` solo con dependencias de producción y `dist/`

```bash
docker build -t real-time-dashboard-backend .
docker run -p 3000:3000 --env-file .env real-time-dashboard-backend
```
