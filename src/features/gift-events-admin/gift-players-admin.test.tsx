import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GiftPlayersAdmin } from "./gift-players-admin";

const { resetRequest, refresh } = vi.hoisted(() => ({
  resetRequest: vi.fn().mockResolvedValue({ id: "reset-1" }),
  refresh: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1", roles: ["SUPER_ADMIN"] } }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateMutation: () => ({ mutateAsync: resetRequest, isPending: false }),
  mutationMessage: () => "Không thể reset",
  usePrivateData: (path: string) => {
    const data = path === "/admin/gift-events"
      ? [{ id: "event-1", title: "Noel", code: "NOEL", effectiveStatus: "LIVE" }]
      : path.includes("play-resets")
        ? { items: [{ id: "reset-1", customerUserId: "customer-1", openId: "play-1", customerName: "Khách A", actorName: "Super Admin", reason: "Kiểm thử sự kiện", createdAt: "2026-11-01T08:00:00Z" }], total: 1 }
        : { items: [{ openId: "play-1", customerUserId: "customer-1", displayName: "Khách A", phone: "0912345678", prizeName: "Voucher giảm 20%", playedAt: "2026-11-01T07:00:00Z" }], total: 1 };
    return { data, isLoading: false, isFetching: false, isError: false, refetch: refresh };
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Gift event player management", () => {
  it("requires a reset reason and sends the selected customer to the event API", async () => {
    render(<GiftPlayersAdmin />);
    expect(screen.getByText("Voucher giảm 20%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset lượt" }));
    const confirm = screen.getByRole("button", { name: "Xác nhận reset" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Lý do reset/), { target: { value: "Test mở quà lần 2" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(resetRequest).toHaveBeenCalledWith({
      path: "/admin/gift-events/event-1/plays/customer-1/reset",
      body: { reason: "Test mở quà lần 2" },
    }));
    expect(screen.getByRole("status")).toHaveTextContent("Đã reset lượt mở quà");
  });

  it("shows the reset operator, reason and timestamp in the audit view", () => {
    render(<GiftPlayersAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /Lịch sử reset/ }));
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Kiểm thử sự kiện")).toBeInTheDocument();
  });
});
