import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch, ApiError, type HttpOptions } from '@/lib/http';
import type { AuthResponse, AuthUser } from '@/types/domain';

const STORAGE_KEY = 'mocmaria.mobile.session.v1';
type Status = 'loading' | 'anonymous' | 'authenticated';
interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  signIn(identifier: string, password: string): Promise<void>;
  register(displayName: string, phone: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  signOutEverywhere(): Promise<void>;
  authorized<T>(path: string, options?: HttpOptions): Promise<T>;
}
const Context = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const tokenRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const persist = useCallback(async (session: AuthResponse | null) => {
    const nextUserId = session?.user.id ?? null;
    if (userIdRef.current !== nextUserId) {
      queryClient.removeQueries({ queryKey: ['private'] });
      userIdRef.current = nextUserId;
    }
    tokenRef.current = session?.accessToken ?? null;
    setUser(session?.user ?? null);
    setStatus(session ? 'authenticated' : 'anonymous');
    if (session) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(STORAGE_KEY);
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) as AuthResponse : null;
        if (!saved?.accessToken || !saved?.user) {
          if (active) await persist(null);
          return;
        }
        // Native refresh is blocked by current browser-cookie-only backend.
        // Restore only while the access JWT is valid; otherwise require fresh sign-in.
        const latestUser = await apiFetch<AuthUser>('/auth/me', { token: saved.accessToken });
        if (active) await persist({ accessToken: saved.accessToken, user: latestUser });
      } catch {
        if (active) await persist(null);
      }
    })();
    return () => { active = false; };
  }, [persist]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const result = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST', body: { identifier: identifier.trim(), password },
    });
    await persist(result);
  }, [persist]);
  const register = useCallback(async (displayName: string, phone: string, email: string, password: string) => {
    const result = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST', body: {
        displayName: displayName.trim(), phone: phone.trim() || undefined,
        email: email.trim() || undefined, password,
      },
    });
    await persist(result);
  }, [persist]);
  const signOut = useCallback(async () => { await persist(null); }, [persist]);
  const signOutEverywhere = useCallback(async () => {
    if (tokenRef.current) {
      await apiFetch<void>('/auth/logout-all', { method: 'POST', token: tokenRef.current });
    }
    await persist(null);
  }, [persist]);
  const authorized = useCallback(async <T,>(path: string, options: HttpOptions = {}): Promise<T> => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, 'Hãy đăng nhập để tiếp tục.');
    try {
      return await apiFetch<T>(path, { ...options, token });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await persist(null);
      throw error;
    }
  }, [persist]);
  const value = useMemo(() => ({
    status, user, signIn, register, signOut, signOutEverywhere, authorized,
  }), [status, user, signIn, register, signOut, signOutEverywhere, authorized]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be inside AuthProvider');
  return value;
}
