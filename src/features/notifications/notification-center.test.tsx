import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "./notification-center";
const state = vi.hoisted(() => ({
  save: vi.fn().mockResolvedValue({}),
  refetch: vi.fn().mockResolvedValue({}),
  digest: {
    enabled: true,
    mode: "daily" as "daily" | "interval",
    hour: 9,
    intervalHours: 24,
    zalo: true,
    email: true,
    nextAt: "2026-10-15T02:00:00Z",
    zaloReady: true,
    emailReady: true,
    pending: 0,
    failed: 0,
  },
  recipients: [{ email: "admin@example.com", enabled: true }],
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: (path: string) => ({
    data:
      path === "/admin/chat-digest"
        ? state.digest
        : path === "/admin/zalo-bot"
          ? { recipientCount: 1 }
          : state.recipients,
    refetch: state.refetch,
    isPending: false,
    isError: false,
    isFetching: false,
  }),
  usePrivateMutation: () => ({ mutateAsync: state.save, isPending: false }),
  mutationMessage: () => "Lưu thất bại",
}));
afterEach(cleanup);
beforeEach(() => {
  state.save.mockClear();
  state.refetch.mockClear();
  state.digest.mode = "daily";
  state.digest.intervalHours = 24;
  state.digest.hour = 9;
  state.digest.enabled = true;
  state.digest.pending = 0;
  state.recipients = [{ email: "admin@example.com", enabled: true }];
});
describe("Notification center schedule and recipients", () => {
  it("shows only daily fields and prevents saving an unchanged schedule", () => {
    render(<NotificationCenter />);
    expect(screen.getByRole("switch", { name: "Bật báo cáo chat" })).toBeChecked();
    expect(screen.getByLabelText("Giờ báo hằng ngày")).toHaveValue("9");
    expect(screen.queryByLabelText("Khoảng cách giữa các lần báo (giờ)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu lịch báo cáo" })).toBeDisabled();
  });
  it("loads saved interval mode correctly and submits a complete compatible schedule", async () => {
    state.digest.mode = "interval";
    state.digest.intervalHours = 6;
    render(<NotificationCenter />);
    expect(screen.queryByLabelText("Giờ báo hằng ngày")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Khoảng cách giữa các lần báo (giờ)")).toHaveValue(6);
    fireEvent.click(screen.getByRole("button", { name: "1 giờ" }));
    fireEvent.click(screen.getByRole("switch", { name: "Gửi qua Zalo" }));
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
  });
  it("does not send invalid hidden interval data when switching back to daily", async () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("radio", { name: /Theo khoảng giờ/ }));
    fireEvent.change(screen.getByLabelText("Khoảng cách giữa các lần báo (giờ)"), {
      target: { value: "0" },
    });
    expect(screen.getByRole("button", { name: "Lưu lịch báo cáo" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Mỗi ngày/ }));
    fireEvent.change(screen.getByLabelText("Giờ báo hằng ngày"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu lịch báo cáo" }));
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        path: "/admin/chat-digest",
        body: expect.objectContaining({ mode: "daily", hour: 10, intervalHours: 24 }),
      }),
    );
  });
  it("preserves unsaved fields across a status refresh", () => {
    const view = render(<NotificationCenter />);
    fireEvent.change(screen.getByLabelText("Giờ báo hằng ngày"), { target: { value: "14" } });
    state.digest.pending = 1;
    view.rerender(<NotificationCenter />);
    expect(screen.getByLabelText("Giờ báo hằng ngày")).toHaveValue("14");
    expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();
  });
  it("normalizes added email addresses and avoids adding an active duplicate", async () => {
    render(<NotificationCenter />);
    fireEvent.change(screen.getByLabelText("Thêm email nhận thông báo"), {
      target: { value: "ADMIN@EXAMPLE.COM" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm email" }));
    expect(state.save).not.toHaveBeenCalled();
    expect(await screen.findByText(/Email này đã có/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Thêm email nhận thông báo"), {
      target: { value: "Owner@Example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm email" }));
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        path: "/admin/notification-emails",
        body: { email: "owner@example.com", enabled: true },
      }),
    );
  });
  it("requires an explicit deletion choice and leaves the email intact when cancelled", async () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole("button", { name: "Xóa admin@example.com" }));
    expect(state.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Giữ lại" }));
    expect(screen.queryByRole("button", { name: "Xóa địa chỉ" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa admin@example.com" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa địa chỉ" }));
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        path: "/admin/notification-emails/admin%40example.com",
        method: "DELETE",
      }),
    );
  });
});
