export type RoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "BRANCH_MANAGER"
  | "RECEPTIONIST"
  | "THERAPIST"
  | "DOCTOR_CONSULTANT"
  | "CUSTOMER";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  sessionId: string;
  roles: RoleName[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";
