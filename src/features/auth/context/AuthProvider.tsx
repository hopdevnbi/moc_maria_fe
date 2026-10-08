"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiRequest, parseApiResponse } from "../auth-api";
import type { AuthResponse, AuthStatus, AuthUser } from "../auth.types";
import {
  AuthContext,
  type AuthContextValue,
  type LoginInput,
  type RegisterInput,
} from "./AuthContext";

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const refreshPromise = useRef<Promise<AuthResponse | null> | null>(null);

  const applyAuth = useCallback((auth: AuthResponse | null) => {
    setAccessToken(auth?.accessToken ?? null);
    setUser(auth?.user ?? null);
    setStatus(auth ? "authenticated" : "anonymous");
  }, []);

  const refresh = useCallback(async (): Promise<AuthResponse | null> => {
    if (refreshPromise.current) return refreshPromise.current;

    refreshPromise.current = (async () => {
      const response = await apiRequest("/auth/refresh", { method: "POST" });
      if (response.status === 401) {
        applyAuth(null);
        return null;
      }
      const auth = await parseApiResponse<AuthResponse>(response);
      applyAuth(auth);
      return auth;
    })().finally(() => {
      refreshPromise.current = null;
    });

    return refreshPromise.current;
  }, [applyAuth]);

  useEffect(() => {
    void refresh().catch(() => applyAuth(null));
  }, [applyAuth, refresh]);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResponse> => {
      const response = await apiRequest("/auth/login", jsonInit("POST", input));
      const auth = await parseApiResponse<AuthResponse>(response);
      applyAuth(auth);
      return auth;
    },
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResponse> => {
      const response = await apiRequest("/auth/register", jsonInit("POST", input));
      const auth = await parseApiResponse<AuthResponse>(response);
      applyAuth(auth);
      return auth;
    },
    [applyAuth],
  );

  const logout = useCallback(async (): Promise<void> => {
    await apiRequest("/auth/logout", { method: "POST" });
    applyAuth(null);
  }, [applyAuth]);

  const logoutAll = useCallback(async (): Promise<void> => {
    if (accessToken) {
      const response = await apiRequest("/auth/logout-all", { method: "POST" }, accessToken);
      await parseApiResponse<void>(response);
    }
    applyAuth(null);
  }, [accessToken, applyAuth]);

  const authFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      let token = accessToken;
      if (!token) {
        const refreshed = await refresh();
        token = refreshed?.accessToken ?? null;
      }
      if (!token) {
        throw new Error("AUTH_REQUIRED");
      }

      let response = await apiRequest(path, init, token);
      if (response.status === 401) {
        const refreshed = await refresh();
        if (!refreshed) throw new Error("AUTH_REQUIRED");
        response = await apiRequest(path, init, refreshed.accessToken);
      }
      return parseApiResponse<T>(response);
    },
    [accessToken, refresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      register,
      logout,
      logoutAll,
      refresh,
      authFetch,
    }),
    [status, user, accessToken, login, register, logout, logoutAll, refresh, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
