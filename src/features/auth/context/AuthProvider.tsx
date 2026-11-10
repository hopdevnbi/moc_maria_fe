"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, parseApiResponse, withAuthRequestDeadline } from "../auth-api";
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
  const queryClient = useQueryClient();
  const authenticatedId = useRef<string | null>(null);
  const authRevision = useRef(0);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const refreshPromise = useRef<Promise<AuthResponse | null> | null>(null);

  useEffect(() => {
    // Only suppress the independent HTML/CSS recovery after bootstrap has
    // actually settled. A hydration failure leaves the recovery link usable.
    if (status !== "loading") document.body.setAttribute("data-moc-auth-settled", "");
    else document.body.removeAttribute("data-moc-auth-settled");
    return () => document.body.removeAttribute("data-moc-auth-settled");
  }, [status]);

  const applyAuth = useCallback(
    (auth: AuthResponse | null) => {
      authRevision.current += 1;
      const nextId = auth?.user.id ?? null;
      if (authenticatedId.current !== nextId) queryClient.clear();
      authenticatedId.current = nextId;
      setAccessToken(auth?.accessToken ?? null);
      setUser(auth?.user ?? null);
      setStatus(auth ? "authenticated" : "anonymous");
    },
    [queryClient],
  );

  const refresh = useCallback(async (): Promise<AuthResponse | null> => {
    if (refreshPromise.current) return refreshPromise.current;

    const startedAtRevision = authRevision.current;
    refreshPromise.current = (async () => {
      const auth = await withAuthRequestDeadline(async (signal) => {
        const response = await apiRequest("/auth/refresh", { method: "POST", signal });
        if (response.status === 401) return null;
        return parseApiResponse<AuthResponse>(response);
      });
      // A slow refresh started before login/logout must not overwrite the
      // newer result, especially on high-latency Safari connections.
      if (authRevision.current === startedAtRevision) applyAuth(auth);
      return auth;
    })().finally(() => {
      refreshPromise.current = null;
    });

    return refreshPromise.current;
  }, [applyAuth]);

  const retrySession = useCallback(async (): Promise<void> => {
    setStatus((previous) => (previous === "authenticated" ? previous : "loading"));
    try {
      await refresh();
    } catch {
      // Network and CORS failures are not proof that a session expired.
      // Let the user retry rather than redirecting them to login forever.
      setStatus((previous) => (previous === "authenticated" ? previous : "unavailable"));
    }
  }, [refresh]);

  useEffect(() => {
    void refresh().catch(() =>
      setStatus((previous) => (previous === "authenticated" ? previous : "unavailable")),
    );
  }, [refresh]);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResponse> => {
      const auth = await withAuthRequestDeadline(async (signal) => {
        const response = await apiRequest("/auth/login", { ...jsonInit("POST", input), signal });
        return parseApiResponse<AuthResponse>(response);
      }, 15_000);
      applyAuth(auth);
      return auth;
    },
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResponse> => {
      const auth = await withAuthRequestDeadline(async (signal) => {
        const response = await apiRequest("/auth/register", { ...jsonInit("POST", input), signal });
        return parseApiResponse<AuthResponse>(response);
      }, 20_000);
      applyAuth(auth);
      return auth;
    },
    [applyAuth],
  );

  const logout = useCallback(async (): Promise<void> => {
    const response = await apiRequest("/auth/logout", { method: "POST" });
    await parseApiResponse<void>(response);
    applyAuth(null);
  }, [applyAuth]);

  const logoutAll = useCallback(async (): Promise<void> => {
    let token = accessToken ?? (await refresh())?.accessToken;
    if (token) {
      let response = await apiRequest("/auth/logout-all", { method: "POST" }, token);
      if (response.status === 401) {
        token = (await refresh())?.accessToken;
        if (!token) {
          applyAuth(null);
          return;
        }
        response = await apiRequest("/auth/logout-all", { method: "POST" }, token);
      }
      await parseApiResponse<void>(response);
    }
    applyAuth(null);
  }, [accessToken, applyAuth, refresh]);

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
      retrySession,
      authFetch,
    }),
    [
      status,
      user,
      accessToken,
      login,
      register,
      logout,
      logoutAll,
      refresh,
      retrySession,
      authFetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
