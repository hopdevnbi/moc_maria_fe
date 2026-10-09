"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Inbox,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { MobileHeader, MobileNavigation } from "./experience";
import "./chat.css";

type Thread = {
  id: string;
  customer_user_id: string;
  provider_user_id: string;
  provider_application_id: string;
  provider_name?: string;
  customer_name?: string;
  updated_at: string;
};
type ChatMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

function hour(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function KtvChatPage({ provider }: { provider?: string }) {
  const { status, user, authFetch } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [current, setCurrent] = useState<Thread | null>(null);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const booted = useRef("");

  const fetchMessages = useCallback(
    async (id: string, quiet = false) => {
      try {
        const messages = await authFetch<ChatMessage[]>("/ktv-chat/threads/" + id + "/messages", {
          cache: "no-store",
        });
        setItems(messages);
        if (!quiet) setError("");
      } catch (caught) {
        if (!quiet)
          setError(caught instanceof Error ? caught.message : "Chưa kết nối được tin nhắn.");
      }
    },
    [authFetch],
  );

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let disposed = false;
    const boot = async () => {
      try {
        const rows = await authFetch<Thread[]>("/ktv-chat/threads", { cache: "no-store" });
        if (disposed) return;
        setThreads(rows);
        if (provider && user.permissions.includes("customer.portal")) {
          const key = user.id + ":" + provider;
          if (booted.current !== key) {
            booted.current = key;
            const opened = await authFetch<Thread>("/ktv-chat/threads", {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ providerApplicationId: provider }),
            });
            if (!disposed) {
              setCurrent(opened);
              setThreads((old) => [opened, ...old.filter((thread) => thread.id !== opened.id)]);
            }
          }
        } else if (!disposed) setCurrent((old) => old || rows[0] || null);
        if (!disposed) setError("");
      } catch (caught) {
        if (!disposed)
          setError(
            caught instanceof Error
              ? caught.message
              : "Chat hiện chưa sẵn sàng. Vui lòng thử lại sau.",
          );
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void boot();
    return () => {
      disposed = true;
    };
  }, [status, user, authFetch, provider]);

  useEffect(() => {
    if (!current || status !== "authenticated") return;
    queueMicrotask(() => {
      void fetchMessages(current.id);
    });
    const interval = setInterval(() => {
      void fetchMessages(current.id, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [current, status, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [items]);

  const sendMessage = async () => {
    if (!current || !draft.trim() || sending) return;
    setSending(true);
    try {
      await authFetch("/ktv-chat/threads/" + current.id + "/messages", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft("");
      await fetchMessages(current.id);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không gửi được tin nhắn, vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mobile-experience ktv-chat-shell">
      <MobileHeader />
      <main className="mm-container ktv-chat-main">
        <Link href="/" className="ktv-chat-back">
          <ArrowLeft size={16} /> Danh sách KTV
        </Link>
        <div className="ktv-chat-heading">
          <span>TRÒ CHUYỆN CÙNG KTV</span>
          <h1>Tin nhắn của bạn</h1>
          <p>
            Trao đổi về dịch vụ và lịch hẹn. Không gửi mật khẩu hay thông tin thanh toán qua chat.
          </p>
        </div>
        {status === "loading" || (loading && !!user) ? (
          <div className="ktv-chat-empty" role="status">
            <LoaderCircle size={24} /> Đang tải hội thoại...
          </div>
        ) : !user ? (
          <div className="ktv-chat-empty">
            <UserRound size={32} />
            <h2>Đăng nhập để nhắn tin</h2>
            <p>Hội thoại riêng tư chỉ dành cho tài khoản đã đăng nhập.</p>
            <Link
              className="ktv-chat-primary"
              href={
                "/dang-nhap?returnTo=" +
                encodeURIComponent("/tin-nhan" + (provider ? "?provider=" + provider : ""))
              }
            >
              Đăng nhập <ArrowRight size={17} />
            </Link>
            <Link href="/dang-ky">Chưa có tài khoản? Đăng ký</Link>
          </div>
        ) : (
          <div className="ktv-chat-layout">
            <aside className="ktv-chat-threads">
              <strong>
                <Inbox size={17} /> Hội thoại
              </strong>
              {threads.length ? (
                threads.map((thread) => (
                  <button
                    type="button"
                    key={thread.id}
                    className={current?.id === thread.id ? "active" : ""}
                    onClick={() => {
                      setCurrent(thread);
                      setError("");
                    }}
                  >
                    <span className="ktv-chat-thread-icon">
                      <UserRound size={20} />
                    </span>
                    <span>
                      <b>
                        {user.id === thread.customer_user_id
                          ? thread.provider_name || "KTV Mộc Maria"
                          : thread.customer_name || "Khách hàng"}
                      </b>
                      <small>Xem tin nhắn</small>
                    </span>
                  </button>
                ))
              ) : (
                <p>Chưa có cuộc trò chuyện nào.</p>
              )}
            </aside>
            <section className="ktv-chat-dialog" aria-label="Nội dung hội thoại">
              <div className="ktv-chat-recipient">
                <span>
                  <MessageCircle size={20} />
                </span>
                <div>
                  <strong>
                    {current
                      ? user.id === current.customer_user_id
                        ? current.provider_name || "KTV Mộc Maria"
                        : current.customer_name || "Khách hàng"
                      : "Chọn hội thoại"}
                  </strong>
                  <small>Tin nhắn riêng tư</small>
                </div>
              </div>
              <div className="ktv-chat-messages" aria-live="polite">
                {current ? (
                  items.length ? (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className={
                          "ktv-chat-bubble " + (item.sender_user_id === user.id ? "own" : "")
                        }
                      >
                        <p>{item.body}</p>
                        <time>{hour(item.created_at)}</time>
                      </div>
                    ))
                  ) : (
                    <div className="ktv-chat-intro">
                      <MessageCircle size={30} />
                      <p>Bắt đầu bằng một lời chào hoặc hỏi về lịch hẹn.</p>
                    </div>
                  )
                ) : (
                  <div className="ktv-chat-intro">
                    <MessageCircle size={30} />
                    <p>Chọn KTV từ trang chủ để bắt đầu trò chuyện.</p>
                    <Link href="/">Xem danh sách KTV</Link>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              {error && (
                <p className="ktv-chat-error" role="alert">
                  {error}
                </p>
              )}
              <form
                className="ktv-chat-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                  placeholder={current ? "Nhập tin nhắn..." : "Chọn hội thoại để bắt đầu"}
                  disabled={!current || sending}
                  aria-label="Nội dung tin nhắn"
                />
                <button
                  type="submit"
                  disabled={!current || !draft.trim() || sending}
                  aria-label="Gửi tin nhắn"
                >
                  <Send size={18} />
                </button>
              </form>
            </section>
          </div>
        )}
        <p className="ktv-chat-footnote">
          <ShieldCheck size={16} /> Chỉ khách và KTV thuộc hội thoại mới có quyền xem tin nhắn.
        </p>
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
