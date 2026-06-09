# Frontend

Dashboard web construido con Next.js 16 y React 19. Muestra métricas de AWS en tiempo real mediante una conexión WebSocket persistente, con gráficos interactivos de Recharts y autenticación JWT con refresh automático.

## Estructura

```
src/
├── app/
│   ├── layout.tsx              # Root layout: AuthProvider, fuente Geist
│   ├── globals.css             # Tailwind v4 + variables de color personalizadas
│   ├── page.tsx                # / → redirect a /dashboard
│   │
│   ├── (auth)/                 # Rutas públicas
│   │   ├── login/page.tsx      # Formulario de login
│   │   └── register/page.tsx   # Formulario de registro
│   │
│   └── (dashboard)/            # Rutas protegidas
│       ├── layout.tsx          # Guard: redirige a /login si no hay sesión
│       ├── dashboard/page.tsx  # Vista principal de métricas en tiempo real
│       ├── profile/page.tsx    # Perfil del usuario
│       └── users/page.tsx      # Gestión de usuarios (solo admin)
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Navegación lateral + menú de usuario + logout
│   │   └── MetricCard.tsx      # Tarjeta resumen (título, valor, unidad, icono)
│   ├── charts/
│   │   ├── MetricChart.tsx     # Wrapper de LineChart / AreaChart (Recharts)
│   │   └── StreamEventsTable.tsx  # Tabla de eventos de DynamoDB Streams
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
│
├── hooks/
│   └── useMetricsStream.ts     # WebSocket con reconexión automática y buffers
│
├── context/
│   └── AuthContext.tsx         # useAuth() — estado de sesión global
│
├── lib/
│   └── api.ts                  # Cliente HTTP con refresh silencioso en 401
│
└── types/
    └── index.ts                # User, AuthData, MetricName, WsMessage, etc.
```

## Variables de entorno

Crear `.env.local` en la raíz del proyecto frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
```

En producción reemplazar con la URL del servidor backend desplegado.

## Inicio rápido

```bash
npm install
npm run dev    # http://localhost:3001
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en el puerto 3001 |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción en el puerto 3001 |

## Rutas

| Ruta | Auth | Descripción |
|------|------|-------------|
| `/` | No | Redirige a `/dashboard` |
| `/login` | No | Inicio de sesión |
| `/register` | No | Registro de cuenta nueva |
| `/dashboard` | Sí | Métricas en tiempo real + eventos de Streams |
| `/profile` | Sí | Perfil del usuario autenticado |
| `/users` | Admin | Listado y gestión de usuarios |

## Hook `useMetricsStream`

El corazón del tiempo real. Gestiona el ciclo de vida completo de la conexión WebSocket.

```
DISCONNECTED ──connect──► CONNECTING ──open──► CONNECTED
     ▲                                              │
     └─────────── error / close  (backoff) ◄────────┘
```

**Reconexión con exponential backoff:** 1 s → 2 s → 4 s → 8 s → 16 s → 30 s (máximo).

**Buffers circulares:** mantiene los últimos 60 puntos de datos por métrica. El tamaño fijo garantiza un footprint de memoria constante independientemente del tiempo que el dashboard lleve abierto.

**Tipos de mensaje manejados:**

```typescript
// Métrica de CloudWatch
{ type: "metric"; name: MetricName; value: number; timestamp: string }

// Evento de DynamoDB Streams
{ type: "stream-event"; eventName: "INSERT" | "MODIFY" | "REMOVE"; ... }
```

**Cleanup seguro:** `mountedRef` previene actualizaciones de estado tras el desmontaje del componente.

## Autenticación

El `AuthContext` gestiona la sesión completa:

1. Al montar la app, comprueba `localStorage` por un refresh token existente.
2. Si existe, llama silenciosamente a `/api/auth/refresh` para obtener un nuevo access token.
3. El cliente HTTP (`lib/api.ts`) inyecta el Bearer token en cada petición.
4. Ante un 401, dispara el refresh silencioso y reintenta la petición original.
5. Si el refresh falla, emite el evento `auth:logout` y limpia la sesión.

Los tokens se almacenan en `localStorage`. El access token tiene expiración corta (15 min); el refresh token, 7 días.

## Dashboard

La página `/dashboard` muestra:

- **6 tarjetas de métricas** con el último valor recibido: CPU Utilization, Network In/Out, Disk Read/Write Bytes.
- **Gráficos de línea / área** (Recharts) por cada métrica, actualizados en tiempo real.
- **Tabla de eventos de Streams** con los últimos 50 eventos INSERT/MODIFY/REMOVE recibidos de DynamoDB.
- **Badge de estado** de la conexión WebSocket: `connected` / `connecting` / `disconnected`.

El layout responde al ancho de pantalla: 2 columnas en móvil, 3 en pantallas `xl`.

## Estilo

Tailwind CSS v4 con paleta personalizada inspirada en AWS:

- `#FF9900` — naranja AWS (acento principal)
- Colores de fondo distintos por métrica para facilitar la lectura rápida
- Fuente Geist (sans-serif) cargada desde Google Fonts

## Stack

| Librería | Versión | Uso |
|----------|---------|-----|
| Next.js | 16.2.7 | Framework (App Router) |
| React | 19.2.4 | UI |
| Recharts | 3.8.1 | Gráficos de series temporales |
| Tailwind CSS | 4 | Estilos utilitarios |
| TypeScript | 5 | Tipado estático |
