"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { Bell, BellOff, LoaderCircle, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import "./chat-notifications.css";

type Config = { publicKey: string | null };
type ChatEvent = { messageId: string; threadId: string };
const CHAT_SOCKET_URL = "https://chat.giangxa.com/moc-maria-chat";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isChatEvent(input: unknown): input is ChatEvent {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<ChatEvent>;
  return (
    typeof value.messageId === "string" &&
    UUID.test(value.messageId) &&
    typeof value.threadId === "string" &&
    UUID.test(value.threadId)
  );
}
function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}
function iosOutsideApp() {
  if (typeof navigator === "undefined") return false;
  const isApple = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  if (!isApple) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}
function decodeVapid(key: string): Uint8Array<ArrayBuffer> {
  const raw = atob(
    key
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(key.length / 4) * 4, "="),
  );
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
function subscriptionDto(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys.auth) throw new Error("Không có khóa đăng ký thông báo.");
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

// KTV opt-in only; force a fresh component instance when the account changes.
export function KtvChatPushControl() {
  const { status, user } = useAuth();
  const therapist = status === "authenticated" && !!user?.roles?.includes("THERAPIST");
  return therapist && user ? <KtvChatPushControlForUser key={user.id} userId={user.id} /> : null;
}

function KtvChatPushControlForUser({ userId }: { userId: string }) {
  const { authFetch } = useAuth();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const optInKey = "mocmaria.ktv.push.optin." + userId;
  const supported = pushSupported();
  const outsideApp = supported && iosOutsideApp();
  const permission = typeof Notification === "undefined" ? "default" : Notification.permission;

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const config = await authFetch<Config>("/ktv-chat/push/config");
        if (!alive) return;
        setConfigured(!!config.publicKey);
        setPublicKey(config.publicKey);
        if (
          !config.publicKey ||
          !pushSupported() ||
          iosOutsideApp() ||
          Notification.permission !== "granted"
        )
          return;
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const optedIn = localStorage.getItem(optInKey) === "yes";
        if (!alive) return;
        if (existing && optedIn) {
          await authFetch<void>("/ktv-chat/push/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscriptionDto(existing)),
          });
          if (alive) setActive(true);
        } else if (existing && !optedIn) {
          // An installed browser might still hold a previous account's endpoint.
          await existing.unsubscribe();
        }
      } catch {
        if (alive) setMessage("Chưa đồng bộ được thông báo. Bạn có thể thử lại.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [authFetch, optInKey]);

  async function enable() {
    if (!supported || outsideApp || !publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      // iOS requires a direct user gesture for the permission request.
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        setMessage("Hãy cho phép thông báo Mộc Maria trong Cài đặt thiết bị.");
        return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapid(publicKey),
        }));
      await authFetch<void>("/ktv-chat/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionDto(subscription)),
      });
      localStorage.setItem(optInKey, "yes");
      setActive(true);
      setMessage("Đã bật. Tin nhắn khách sẽ hiện cả khi ứng dụng chạy nền.");
    } catch {
      setMessage("Không bật được thông báo. Kiểm tra quyền và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await authFetch<void>("/ktv-chat/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      localStorage.removeItem(optInKey);
      setActive(false);
      setMessage("Đã tắt thông báo đẩy trên thiết bị này.");
    } catch {
      setMessage("Chưa tắt được thông báo. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const explanation = !supported
    ? "Trình duyệt chưa hỗ trợ Push. Tin nhắn vẫn hiển thị khi đang mở trang."
    : outsideApp
      ? "iPhone: mở Safari → Chia sẻ → Thêm vào Màn hình chính. Mở Mộc Maria từ biểu tượng rồi bật thông báo."
      : configured === false
        ? "Hệ thống chưa cấu hình Web Push. Bạn vẫn có thể dùng chat như trước."
        : permission === "denied"
          ? "Quyền thông báo đang bị chặn. Hãy bật trong Cài đặt thiết bị."
          : message;

  return (
    <div className="moc-chat-push">
      <button
        type="button"
        className={active ? "moc-chat-push-button is-enabled" : "moc-chat-push-button"}
        onClick={() => {
          void (active ? disable() : enable());
        }}
        disabled={
          busy || !supported || outsideApp || !configured || (!active && permission === "denied")
        }
        aria-pressed={active}
        aria-label={
          active ? "Tắt thông báo tin nhắn trên thiết bị" : "Bật thông báo tin nhắn trên thiết bị"
        }
      >
        {busy ? (
          <LoaderCircle size={17} className="moc-chat-push-spin" />
        ) : active ? (
          <Bell size={17} />
        ) : (
          <BellOff size={17} />
        )}
        <span>{active ? "Đã bật thông báo tin nhắn" : "Bật thông báo tin nhắn"}</span>
      </button>
      {explanation && <small role="status">{explanation}</small>}
    </div>
  );
}

// A private KTV socket remains connected across every authenticated page.
export function KtvChatNotificationListener() {
  const { status, user } = useAuth();
  const therapist = status === "authenticated" && !!user?.roles?.includes("THERAPIST");
  return therapist && user ? <KtvChatNotificationSession key={user.id} userId={user.id} /> : null;
}

function KtvChatNotificationSession({ userId }: { userId: string }) {
  const { accessToken, refresh } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const [toast, setToast] = useState<ChatEvent | null>(null);
  const seen = useRef(new Set<string>());
  const received = useCallback(
    (input: unknown) => {
      if (!isChatEvent(input) || seen.current.has(input.messageId)) return;
      seen.current.add(input.messageId);
      if (seen.current.size > 200) seen.current.clear();
      void client.invalidateQueries({ queryKey: ["ktv-chat", userId, "threads"] });
      void client.invalidateQueries({ queryKey: ["ktv-chat", userId, "messages", input.threadId] });
      if (document.visibilityState === "visible") setToast(input);
    },
    [client, userId],
  );

  useEffect(() => {
    const onPush = (event: MessageEvent) => {
      if (event.data?.type === "moc-maria:chat:push") received(event.data);
    };
    navigator.serviceWorker?.addEventListener("message", onPush);
    return () => navigator.serviceWorker?.removeEventListener("message", onPush);
  }, [received]);

  useEffect(() => {
    if (!accessToken) return;
    let disposed = false;
    const socket = io(CHAT_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelayMax: 15000,
      timeout: 7000,
    });
    socket.on("moc-maria:chat:new", received);
    const reauthenticate = () => {
      void refresh()
        .then((auth) => {
          if (disposed || !auth || auth.user.id !== userId) return;
          socket.auth = { token: auth.accessToken };
          if (!socket.connected) socket.connect();
        })
        .catch(() => {});
    };
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") reauthenticate();
    });
    socket.on("connect_error", (error) => {
      if (/unauthorized/i.test(error.message)) reauthenticate();
    });
    return () => {
      disposed = true;
      socket.off("moc-maria:chat:new", received);
      socket.disconnect();
    };
  }, [userId, accessToken, received, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <aside className="moc-chat-toast" role="status" aria-live="polite">
      <Bell size={20} aria-hidden />
      <div>
        <strong>Khách hàng vừa gửi tin nhắn</strong>
        <p>Bấm để mở hội thoại và trả lời.</p>
      </div>
      <button
        type="button"
        className="moc-chat-toast-open"
        onClick={() => {
          router.push("/tin-nhan?thread=" + encodeURIComponent(toast.threadId));
          setToast(null);
        }}
      >
        Xem
      </button>
      <button
        type="button"
        className="moc-chat-toast-close"
        aria-label="Đóng thông báo"
        onClick={() => setToast(null)}
      >
        <X size={16} />
      </button>
    </aside>
  );
}
