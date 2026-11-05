import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckInForRole } from "./check-in-page";

const state = vi.hoisted(() => ({
  user: { id: "guest", roles: ["CUSTOMER"], permissions: [] } as {
    id: string;
    roles: string[];
    permissions: string[];
  },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock("./staff-attendance-card", () => ({
  StaffAttendanceCard: () => <div>Nhân viên check-in 200m</div>,
}));
vi.mock("./customer-attendance-card", () => ({
  CustomerAttendanceCard: () => <div>Khách hàng check-in 100m</div>,
}));
vi.mock("@/features/mobile/experience", () => ({ MobileHeader: () => null }));
vi.mock("@/features/mobile/mobile-navigation", () => ({ MobileNavigation: () => null }));
vi.mock("./check-in-journey-sharing", () => ({ CheckInJourneySharing: () => null }));
vi.mock("./super-admin-checkin-tracking", () => ({ SuperAdminCheckInTracking: () => null }));
afterEach(cleanup);

describe("check-in role switching", () => {
  it.each([
    ["CUSTOMER", ["CUSTOMER"], [], "Khách hàng check-in 100m"],
    ["no staff roles", [], [], "Khách hàng check-in 100m"],
    ["KTV", ["THERAPIST"], [], "Nhân viên check-in 200m"],
    ["Super Admin", ["SUPER_ADMIN"], [], "Nhân viên check-in 200m"],
    ["staff permission", [], ["staff.portal"], "Nhân viên check-in 200m"],
  ])("routes %s to the correct check-in flow", (_role, roles, permissions, text) => {
    state.user = { id: "account", roles, permissions };
    render(<CheckInForRole />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
