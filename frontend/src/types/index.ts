export type UserRole = "admin" | "user" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AuthUser = Pick<User, "id" | "name" | "email" | "roles">;

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthData extends AuthTokens {
  user: AuthUser;
}

export type MetricName = "cpu" | "requests" | "latency" | "errors";

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export type MetricsBuffer = Record<MetricName, MetricPoint[]>;

export type WsStatus = "disconnected" | "connecting" | "connected";

export interface StreamEvent {
  type: "stream-event";
  eventName: "INSERT" | "MODIFY" | "REMOVE";
  tableName: string;
  keys: Record<string, unknown>;
  newImage?: Record<string, unknown>;
  oldImage?: Record<string, unknown>;
  timestamp: string;
}
