import { createContext } from "react";
import type { AuthResponse, AuthStatus, AuthUser } from "../auth.types";

export interface RegisterInput {
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login(input: LoginInput): Promise<AuthResponse>;
  register(input: RegisterInput): Promise<AuthResponse>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  refresh(): Promise<AuthResponse | null>;
  authFetch<T>(path: string, init?: RequestInit): Promise<T>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
