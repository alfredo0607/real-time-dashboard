"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
import type { AuthUser, ApiResponse, AuthData } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from stored refresh token on mount
  useEffect(() => {
    const rt = localStorage.getItem("refreshToken");
    if (!rt) {
      setIsLoading(false);
      return;
    }

    api
      .refreshAuth(rt)
      .then(async ({ accessToken, refreshToken }) => {
        api.setAccessToken(accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        const { data } = await api.get<ApiResponse<AuthUser>>("/api/users/me");
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for forced logouts triggered by 401 + failed refresh
  useEffect(() => {
    const handle = () => {
      setUser(null);
      api.clearAccessToken();
    };
    window.addEventListener("auth:logout", handle);
    return () => window.removeEventListener("auth:logout", handle);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<AuthData>>(
      "/api/auth/login",
      { email, password },
    );
    api.setAccessToken(data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await api.post<ApiResponse<AuthData>>(
        "/api/auth/register",
        { name, email, password },
      );
      api.setAccessToken(data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const rt = localStorage.getItem("refreshToken");
    if (rt) {
      await api
        .post("/api/auth/logout", { refreshToken: rt })
        .catch(() => {});
    }
    api.clearAccessToken();
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
