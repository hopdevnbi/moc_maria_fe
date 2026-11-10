import type { AuthUser } from "./auth.types";

export function canUsePersonalBooking(
  user: Pick<AuthUser, "roles" | "permissions" | "isActive"> | null | undefined,
): boolean {
  return (
    !!user &&
    user.isActive !== false &&
    (user.permissions.includes("customer.portal") ||
      !!user.roles?.some((role) =>
        [
          "THERAPIST",
          "DOCTOR_CONSULTANT",
          "SUPER_ADMIN",
          "ADMIN",
          "BRANCH_MANAGER",
          "RECEPTIONIST",
        ].includes(role),
      ))
  );
}
