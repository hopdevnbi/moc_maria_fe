import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationEmailsAdmin } from "./notification-emails-admin";
const state = vi.hoisted(() => ({
  save: vi.fn().mockResolvedValue({}),
  refetch: vi.fn(),
  settings: {
    enabled: true,
    mode: "daily",
    hour: 9,
    intervalHours: 24,
    zalo: true,
    email: true,
    nextAt: "2026-10-13T02:00:00Z",
    zaloReady: false,
    emailReady: true,
    pending: 0,
    failed: 0,
  },
}));
vi.mock("./private-api", () => ({
  usePrivateData: (path: string) => ({
    data:
      path === "/admin/chat-digest"
        ? state.settings
        : [{ email: "admin@example.com", enabled: true }],
    refetch: state.refetch,
  }),
  usePrivateMutation: () => ({ mutateAsync: state.save }),
  mutationMessage: () => "Lưu thất bại",
}));
afterEach(() => {
  cleanup();
  state.save.mockClear();
});
describe("Admin thread digest settings", () => {
  it("shows missing Zalo setup and saves a one-hour schedule with channel toggles", async () => {
    render(<NotificationEmailsAdmin />);
    expect(screen.getByText(/Chưa kết nối người nhận với Bot/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tần suất"), { target: { value: "interval" } });
    fireEvent.change(screen.getByLabelText("Khoảng cách giữa các lần báo (giờ)"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByLabelText("Gửi qua Zalo"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu lịch báo cáo" }));
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        path: "/admin/chat-digest",
        body: {
          enabled: true,
          mode: "interval",
          hour: 9,
          intervalHours: 1,
          zalo: false,
          email: true,
        },
      }),
    );
    await screen.findByText("Đã lưu lịch báo cáo hội thoại.");
  });
});
