import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatMonitor } from "./chat-monitor";
const mock = vi.hoisted(() => ({
  user: { id: "admin", roles: ["SUPER_ADMIN"], permissions: ["admin.portal", "customers.manage"] },
  fetch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mock.user, authFetch: mock.fetch }),
}));
const item = {
  id: "m1",
  seq: "2",
  threadId: "11111111-1111-4111-8111-111111111111",
  customerName: "QA customer",
  providerName: "QA therapist",
  senderName: "QA customer",
  senderRole: "customer",
  body: "First message",
  imageUrl: null,
  protected: false,
  createdAt: "2026-11-20T02:00:00Z",
};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mock.fetch.mockReset();
  mock.user.roles = ["SUPER_ADMIN"];
});
it.each(["ADMIN", "CUSTOMER", "THERAPIST", "RECEPTIONIST"])(
  "does not request private data for %s",
  (role) => {
    mock.user.roles = [role];
    render(<ChatMonitor />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mock.fetch).not.toHaveBeenCalled();
  },
);
it("shows both directions, refreshes new messages, opens history and masks protected messages", async () => {
  vi.useFakeTimers();
  mock.fetch
    .mockResolvedValueOnce({ items: [item], nextBefore: null })
    .mockResolvedValueOnce({
      items: [
        { ...item, id: "m2", seq: "3", senderRole: "provider", body: "Therapist reply" },
        item,
      ],
      nextBefore: null,
    })
    .mockResolvedValue({ items: [{ ...item, protected: true, body: null }], nextBefore: null });
  render(<ChatMonitor />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByText("First message")).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000);
  });
  expect(screen.getByText("Therapist reply")).toBeInTheDocument();
  expect(screen.getByText("Tin nhắn mới")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Xem hội thoại" })[0]);
  await act(async () => {
    await Promise.resolve();
  });
  expect(mock.fetch).toHaveBeenLastCalledWith(
    "/admin/chat-monitor/threads/" + item.threadId,
    expect.objectContaining({ cache: "no-store" }),
  );
  expect(screen.getByText("Hội thoại có mật khẩu · nội dung được ẩn")).toBeInTheDocument();
  expect(screen.queryByText("First message")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Mở hỗ trợ" })).not.toBeInTheDocument();
});
