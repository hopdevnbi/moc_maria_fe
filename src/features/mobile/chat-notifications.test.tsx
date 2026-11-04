import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPushControl, shouldShowChatUnread } from "./chat-notifications";

const mocks = vi.hoisted(() => ({
  user: { id: "test-ktv", roles: ["THERAPIST"] as string[] },
  authFetch: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: mocks.user,
    authFetch: mocks.authFetch,
  }),
}));

const previousServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

beforeEach(() => {
  mocks.user = { id: "test-ktv", roles: ["THERAPIST"] };
  localStorage.clear();
  mocks.authFetch
    .mockReset()
    .mockImplementation(async (path: string) =>
      path === "/ktv-chat/push/config" ? { publicKey: "AQAB" } : undefined,
    );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (previousServiceWorker)
    Object.defineProperty(navigator, "serviceWorker", previousServiceWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("two-way chat Web Push opt-in", () => {
  it("deduplicates foreground unread polling against initial load and Socket events", () => {
    const previous = { count: 1, updatedAt: "2026-11-04T07:00:00.000Z" };
    const incoming = { count: 2, updatedAt: "2026-11-04T07:00:08.000Z" };
    expect(shouldShowChatUnread(undefined, incoming, false)).toBe(false);
    expect(shouldShowChatUnread(previous, incoming, false)).toBe(true);
    expect(shouldShowChatUnread(previous, incoming, true)).toBe(false);
    expect(shouldShowChatUnread(previous, { ...incoming, count: 1 }, false)).toBe(false);
  });
  it("offers the same notification control to customers as KTVs", async () => {
    mocks.user = { id: "customer", roles: ["CUSTOMER"] };
    render(<ChatPushControl />);
    expect(
      await screen.findByRole("button", { name: /bật thông báo tin nhắn/i }),
    ).toBeInTheDocument();
    expect(mocks.authFetch).toHaveBeenCalledWith("/ktv-chat/push/config");
  });

  it("never registers unrelated admin roles", () => {
    mocks.user = { id: "admin", roles: ["ADMIN"] };
    render(<ChatPushControl />);
    expect(screen.queryByRole("button", { name: /bật thông báo tin nhắn/i })).toBeNull();
    expect(mocks.authFetch).not.toHaveBeenCalled();
  });

  it("explains why a compact bell cannot yet activate instead of leaving it inert", async () => {
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("PushManager", function PushManager() {});
    vi.stubGlobal("isSecureContext", true);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
    mocks.authFetch.mockResolvedValueOnce({ publicKey: null });
    render(<ChatPushControl compact />);
    const button = screen.getByRole("button", { name: /bật thông báo tin nhắn/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    expect(screen.getByRole("status")).toHaveTextContent(/chưa được hệ thống kích hoạt/i);
    expect(mocks.authFetch).toHaveBeenCalledWith("/ktv-chat/push/config");
  });

  it("guides iPhone Safari users to install the Home Screen app for Push", async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "userAgent");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15",
    });
    try {
      render(<ChatPushControl compact />);
      const button = screen.getByRole("button", { name: /bật thông báo tin nhắn/i });
      await waitFor(() => expect(button).not.toBeDisabled());
      fireEvent.click(button);
      expect(screen.getByRole("status")).toHaveTextContent(/Thêm vào Màn hình chính/i);
    } finally {
      if (original) Object.defineProperty(navigator, "userAgent", original);
      else Reflect.deleteProperty(navigator, "userAgent");
    }
  });

  it("does not auto-request notification permission, and subscribes only after a click", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    const NotificationMock = { permission: "default", requestPermission };
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("PushManager", function PushManager() {});
    vi.stubGlobal("isSecureContext", true);

    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      toJSON: () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: {
          p256dh: "aaaabbbbccccddddeeeeffffgggghhhh",
          auth: "abcdefghijklmno",
        },
      }),
    };
    const manager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };
    const registration = { pushManager: manager };
    const register = vi.fn().mockResolvedValue(registration);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register, ready: Promise.resolve(registration) },
    });

    render(<ChatPushControl />);
    const button = await screen.findByRole("button", { name: /bật thông báo tin nhắn/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(requestPermission).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(mocks.authFetch).toHaveBeenCalledWith(
        "/ktv-chat/push/subscriptions",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(manager.subscribe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /tắt thông báo tin nhắn/i })).toBeInTheDocument();
  });
});
