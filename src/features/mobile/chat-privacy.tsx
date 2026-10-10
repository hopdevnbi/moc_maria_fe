"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, LockKeyhole, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiError } from "@/features/auth/auth-api";

export function isChatLockedError(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    (error.details as { error?: string } | undefined)?.error === "CHAT_LOCKED"
  );
}

export type ChatPrivacyState = {
  id: string;
  privacy_enabled?: boolean;
  history_locked?: boolean;
  unlock_expires_at?: string | null;
  unlock_token?: string;
};
type Action = "password" | "unlock" | "lock" | "remove" | "recover";

export function ChatPrivacyControls({
  thread,
  onState,
  onConceal,
}: {
  thread: ChatPrivacyState;
  onState: (state: ChatPrivacyState) => void;
  onConceal: () => void;
}) {
  const { authFetch } = useAuth();
  const [mode, setMode] = useState<Action | null>(null);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.querySelector("input")?.focus();
  }, [mode, thread.history_locked]);
  const clear = () => {
    setPassword("");
    setCurrentPassword("");
    setConfirmation("");
    setError("");
  };
  useEffect(() => {
    if (!thread.privacy_enabled || thread.history_locked || !thread.unlock_expires_at) return;
    const expiry = Date.parse(thread.unlock_expires_at);
    const timer = window.setTimeout(onConceal, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [thread.privacy_enabled, thread.history_locked, thread.unlock_expires_at, onConceal]);

  const submit = async (action: Action) => {
    if (busy) return;
    if (action === "password" && password !== confirmation) {
      setError("Hai lần nhập mật khẩu chưa khớp.");
      return;
    }
    setBusy(true);
    setError("");
    if (action === "lock") onConceal();
    try {
      const result = await authFetch<ChatPrivacyState>(
        `/ktv-chat/threads/${thread.id}/privacy/${action}`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "lock"
              ? {}
              : action === "password"
                ? { password, ...(thread.privacy_enabled ? { currentPassword } : {}) }
                : { password },
          ),
        },
      );
      onState(result);
      setMode(null);
      clear();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Chưa thể thực hiện. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  const open = (action: Action) => {
    clear();
    setMode(action);
  };
  const action = mode ?? (thread.history_locked ? "unlock" : null);
  const title =
    action === "unlock"
      ? "Hội thoại đã khóa"
      : action === "recover"
        ? "Quên mật khẩu chat?"
        : action === "remove"
          ? "Bỏ mật khẩu chat"
          : thread.privacy_enabled
            ? "Đổi mật khẩu chat"
            : "Đặt mật khẩu chat";
  const form = action && (
    <form
      ref={formRef}
      className="ktv-chat-privacy-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(action);
      }}
    >
      <LockKeyhole size={30} />
      <h2>{title}</h2>
      <p>
        {action === "recover"
          ? "Nhập mật khẩu tài khoản Mộc Maria của bạn để bỏ khóa chat. Tin nhắn vẫn được giữ nguyên."
          : action === "unlock"
            ? "Nhập mật khẩu riêng của cuộc trò chuyện này để xem và tiếp tục nhắn tin."
            : action === "remove"
              ? "Xác nhận mật khẩu chat hiện tại. Sau khi bỏ khóa, bạn xem tin nhắn bằng tài khoản như bình thường."
              : "Mật khẩu chỉ bảo vệ lịch sử ở phía bạn. KTV vẫn nhận và trả lời tin nhắn bình thường."}
      </p>
      {action === "password" && thread.privacy_enabled && (
        <label>
          Mật khẩu chat hiện tại
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
          />
        </label>
      )}
      <label>
        {action === "recover"
          ? "Mật khẩu tài khoản"
          : action === "password"
            ? "Mật khẩu chat mới"
            : "Mật khẩu chat"}
        <input
          type="password"
          autoComplete={action === "password" ? "new-password" : "current-password"}
          required
          minLength={action === "password" ? 6 : 1}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </label>
      {action === "password" && (
        <>
          <label>
            Nhập lại mật khẩu chat mới
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={busy}
            />
          </label>
          <small>
            Ít nhất 6 ký tự. Tự khóa sau 15 phút, khi rời hội thoại hoặc tải lại trang. Không dùng
            chung mật khẩu tài khoản.
          </small>
        </>
      )}
      {error && (
        <p role="alert" className="ktv-chat-error">
          {error}
        </p>
      )}
      <button className="ktv-chat-primary" disabled={busy} type="submit">
        {busy
          ? "Đang xử lý…"
          : action === "unlock"
            ? "Mở khóa hội thoại"
            : action === "recover" || action === "remove"
              ? "Xác nhận bỏ khóa"
              : "Lưu mật khẩu chat"}
      </button>
      {action === "unlock" && (
        <button type="button" onClick={() => open("recover")} disabled={busy}>
          Quên mật khẩu chat?
        </button>
      )}
      {mode && thread.history_locked && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            clear();
            setMode(null);
          }}
        >
          Quay lại mở khóa
        </button>
      )}
    </form>
  );
  return (
    <div className={`ktv-chat-privacy${thread.history_locked ? " locked" : ""}`}>
      {thread.history_locked ? (
        form
      ) : (
        <>
          <button type="button" onClick={() => open("password")}>
            <KeyRound size={16} />
            {thread.privacy_enabled ? "Mật khẩu chat" : "Đặt mật khẩu chat"}
          </button>
          {thread.privacy_enabled && (
            <>
              <button type="button" onClick={() => void submit("lock")} disabled={busy}>
                <LockKeyhole size={15} /> Khóa ngay
              </button>
              <button type="button" onClick={() => open("remove")}>
                Bỏ mật khẩu
              </button>
            </>
          )}
          {error && !mode && <p role="alert">{error}</p>}
        </>
      )}
      {mode && !thread.history_locked && (
        <div className="ktv-chat-privacy-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="ktv-chat-privacy-dialog"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) {
                clear();
                setMode(null);
              }
              if (e.key !== "Tab") return;
              const fields = e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled),input:not(:disabled)",
              );
              const first = fields[0],
                last = fields[fields.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
          >
            <button
              type="button"
              className="ktv-chat-icon-button"
              aria-label="Đóng quản lý mật khẩu chat"
              disabled={busy}
              onClick={() => {
                clear();
                setMode(null);
              }}
            >
              <X size={20} />
            </button>
            {form}
          </div>
        </div>
      )}
    </div>
  );
}
