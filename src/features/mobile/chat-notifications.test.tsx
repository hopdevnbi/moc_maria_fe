import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvChatPushControl } from "./chat-notifications";

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

describe("KTV Web Push opt-in", () => {
  it("never offers registration to an ordinary customer", () => {
    mocks.user = { id: "customer", roles: ["CUSTOMER"] };
    render(<KtvChatPushControl />);
    expect(screen.queryByRole("button", { name: /bật thông báo tin nhắn/i })).toBeNull();
    expect(mocks.authFetch).not.toHaveBeenCalled();
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

    render(<KtvChatPushControl />);
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
