const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

let _accessToken: string | null = null;

export function setAccessToken(token: string): void {
  _accessToken = token;
}

export function clearAccessToken(): void {
  _accessToken = null;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

async function silentRefresh(): Promise<RefreshResult | null> {
  const rt =
    typeof window !== "undefined"
      ? localStorage.getItem("refreshToken")
      : null;
  if (!rt) return null;

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) return null;

  const { data } = (await res.json()) as {
    data: RefreshResult;
  };
  return data;
}

async function doFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res = await doFetch(path, options);

  if (res.status === 401 && _accessToken) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      setAccessToken(refreshed.accessToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("refreshToken", refreshed.refreshToken);
      }
      res = await doFetch(path, options);
    } else {
      clearAccessToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("refreshToken");
        window.dispatchEvent(new Event("auth:logout"));
      }
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: res.statusText })) as { message?: string };
    throw new Error(body.message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export const get = <T>(path: string) =>
  apiFetch<T>(path, { method: "GET" });

export const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const del = <T>(path: string) =>
  apiFetch<T>(path, { method: "DELETE" });

export async function refreshAuth(
  refreshToken: string,
): Promise<RefreshResult> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const { data } = (await res.json()) as { data: RefreshResult };
  return data;
}
