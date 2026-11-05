import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuperAdminCheckInTracking } from "./super-admin-checkin-tracking";

const state = vi.hoisted(() => ({
  user: { id: "admin", isActive: true, roles: ["SUPER_ADMIN"] as string[] },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock("@/features/safety/admin-safety", () => ({
  AdminSafety: ({ initialMapOpen }: { initialMapOpen?: boolean }) => (
    <div data-testid="admin-monitor">Bản đồ theo dõi · {String(initialMapOpen)}</div>
  ),
}));

beforeEach(() => {
  state.user = { id: "admin", isActive: true, roles: ["SUPER_ADMIN"] };
});
afterEach(cleanup);

describe("Super Admin map on check-in page", () => {
  it("is a compact, lazy-loaded map that opens with one click", () => {
    render(<SuperAdminCheckInTracking />);
    expect(screen.getByText("Bản đồ check-in & hành trình KTV")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-monitor")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Xem bản đồ" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getByTestId("admin-monitor")).toHaveTextContent("true");
    expect(screen.getByRole("link", { name: /Mở giao diện quản trị đầy đủ/ })).toHaveAttribute(
      "href",
      "/quan-tri/cham-cong",
    );
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn bản đồ" }));
    expect(screen.queryByTestId("admin-monitor")).not.toBeInTheDocument();
  });

  it.each([
    ["customer", ["CUSTOMER"], true],
    ["KTV", ["THERAPIST"], true],
    ["inactive super admin", ["SUPER_ADMIN"], false],
  ])("never mounts the monitor for %s", (_label, roles, isActive) => {
    state.user = { id: "other", isActive, roles };
    render(<SuperAdminCheckInTracking />);
    expect(screen.queryByText("Bản đồ check-in & hành trình KTV")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-monitor")).not.toBeInTheDocument();
  });
});
