"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Provider } from "@/features/marketplace/types";
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
  last_message?: string | null;
  unread_count?: number;
};
type ChatMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};
const json = (body: unknown): RequestInit => ({
  method: "POST",
  cache: "no-store",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");
}
function normalize(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
function time(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function day(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
function chatError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("chỉ cho phép xem lịch sử") ||
    message.includes("quá nhanh") ||
    message.includes("chính mình")
  )
    return message;
  return "Chưa kết nối được chat. Vui lòng thử lại sau ít phút.";
}

export function KtvChatPage({ provider }: { provider?: string }) {
  const { status, user, authFetch } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState("");
  const [deepLinkAttempt, setDeepLinkAttempt] = useState(0);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const openedProvider = useRef("");
  const nearBottom = useRef(true);
  const pendingSend = useRef<Record<string, { body: string; clientMessageId: string }>>({});
  const enabled = status === "authenticated" && !!user;
  const customer = !!user?.permissions.includes("customer.portal");
  const key = ["ktv-chat", user?.id];
  const threads = useQuery({
    queryKey: [...key, "threads"],
    queryFn: () => authFetch<Thread[]>("/ktv-chat/threads", { cache: "no-store" }),
    enabled,
    refetchInterval: 8000,
    retry: 1,
  });
  const directory = useQuery({
    queryKey: [...key, "providers"],
    queryFn: () => authFetch<Provider[]>("/providers", { cache: "no-store" }),
    enabled: enabled && customer,
    retry: 1,
  });
  const current = threads.data?.find((thread) => thread.id === selectedId) ?? null;
  const recipient = (thread: Thread) =>
    user?.id === thread.customer_user_id
      ? thread.provider_name || "KTV Mộc Maria"
      : thread.customer_name || "Khách hàng";
  const history = useInfiniteQuery({
    queryKey: [...key, "messages", selectedId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      authFetch<ChatMessage[]>(
        `/ktv-chat/threads/${selectedId}/messages${pageParam ? "?before=" + pageParam : ""}`,
        { cache: "no-store" },
      ),
    getNextPageParam: (page) => (page.length === 50 ? page[0].id : undefined),
    enabled: enabled && !!selectedId && !choosing,
    refetchInterval: 5000,
    retry: 1,
  });
  const messages = useMemo(() => {
    const seen = new Set<string>();
    return [...(history.data?.pages ?? [])]
      .reverse()
      .flat()
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [history.data]);
  const latestMessageId = history.data?.pages[0]?.at(-1)?.id;
  const open = useMutation({
    mutationFn: (id: string) =>
      authFetch<Thread>("/ktv-chat/threads", json({ providerApplicationId: id })),
    onSuccess: (thread) => {
      client.setQueryData<Thread[]>([...key, "threads"], (old) => [
        thread,
        ...(old ?? []).filter((item) => item.id !== thread.id),
      ]);
      setSelectedId(thread.id);
      setChoosing(false);
      setActionError("");
      nearBottom.current = true;
    },
    onError: (error) => setActionError(chatError(error)),
  });
  useEffect(() => {
    if (!enabled || !customer || !provider) return;
    const requested = user?.id + ":" + provider;
    if (openedProvider.current === requested) return;
    let disposed = false;
    void authFetch<Thread>("/ktv-chat/threads", json({ providerApplicationId: provider }))
      .then((thread) => {
        if (disposed) return;
        openedProvider.current = requested;
        client.setQueryData<Thread[]>(["ktv-chat", user?.id, "threads"], (old) => [
          thread,
          ...(old ?? []).filter((item) => item.id !== thread.id),
        ]);
        setSelectedId(thread.id);
        setChoosing(false);
        setActionError("");
      })
      .catch((error) => {
        if (!disposed) setActionError(chatError(error));
      });
    return () => {
      disposed = true;
    };
  }, [enabled, customer, provider, authFetch, client, user?.id, deepLinkAttempt]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () =>
      shellRef.current?.style.setProperty("--ktv-chat-height", `${viewport.height}px`);
    resize();
    viewport.addEventListener("resize", resize);
    return () => viewport.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!enabled || !selectedId || !latestMessageId || choosing) return;
    let disposed = false;
    void authFetch(`/ktv-chat/threads/${selectedId}/read`, json({ lastMessageId: latestMessageId }))
      .then(() => {
        if (!disposed)
          client.setQueryData<Thread[]>(["ktv-chat", user?.id, "threads"], (old) =>
            old?.map((thread) =>
              thread.id === selectedId ? { ...thread, unread_count: 0 } : thread,
            ),
          );
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [enabled, selectedId, latestMessageId, choosing, authFetch, client, user?.id]);
  useEffect(() => {
    if (nearBottom.current && messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [latestMessageId, selectedId, choosing]);
  const send = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => {
      const pending = pendingSend.current[id];
      const input =
        pending?.body === body ? pending : { body, clientMessageId: crypto.randomUUID() };
      pendingSend.current[id] = input;
      return authFetch<ChatMessage>(`/ktv-chat/threads/${id}/messages`, json(input));
    },
    onSuccess: (_message, { id, body }) => {
      delete pendingSend.current[id];
      setDrafts((old) => (old[id]?.trim() === body ? { ...old, [id]: "" } : old));
      setActionError("");
      nearBottom.current = true;
      void client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "messages", id] });
      void client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "threads"] });
    },
    onError: (error) => setActionError(chatError(error)),
  });
  const showDirectory = choosing || !threads.data?.length;
  const query = normalize(search);
  const filteredThreads = (threads.data ?? []).filter((thread) =>
    normalize(recipient(thread)).includes(query),
  );
  const filteredProviders = (directory.data ?? []).filter(
    (item) =>
      !item.isDemo && normalize(item.publicName + " " + (item.serviceArea ?? "")).includes(query),
  );
  const draft = selectedId ? (drafts[selectedId] ?? "") : "";
  const error =
    actionError ||
    (threads.isError || history.isError ? chatError(threads.error || history.error) : "");
  const select = (thread: Thread) => {
    setSelectedId(thread.id);
    setChoosing(false);
    setActionError("");
    nearBottom.current = true;
  };
  const pick = () => {
    setChoosing(true);
    setSearch("");
    setActionError("");
  };
  const retry = () => {
    setActionError("");
    void threads.refetch();
    void directory.refetch();
    if (selectedId) void history.refetch();
    if (provider && !selectedId) setDeepLinkAttempt((old) => old + 1);
  };

  return (
    <div
      ref={shellRef}
      className={`mobile-experience ktv-chat-shell${current && !choosing ? " is-conversation" : ""}`}
    >
      <MobileHeader />
      <main className="mm-container ktv-chat-main">
        <div className="ktv-chat-heading">
          <div>
            <span>CHĂM SÓC BẮT ĐẦU TỪ LẮNG NGHE</span>
            <h1>Trò chuyện cùng KTV</h1>
            <p>Chọn kỹ thuật viên bạn tin tưởng. Mỗi người, một cuộc trò chuyện riêng.</p>
          </div>
          <span className="ktv-chat-private">
            <ShieldCheck size={16} /> Hội thoại riêng tư
          </span>
        </div>
        {status === "loading" ? (
          <div className="ktv-chat-empty" role="status">
            <LoaderCircle className="ktv-chat-spinner" /> Đang tải tài khoản...
          </div>
        ) : !user ? (
          <div className="ktv-chat-empty">
            <div className="ktv-chat-hero-icon">
              <MessageCircle size={32} />
            </div>
            <h2>Kết nối với KTV của bạn</h2>
            <p>
              Đăng nhập để chọn KTV, trao đổi về dịch vụ và lưu lại những cuộc trò chuyện của bạn.
            </p>
            <Link
              className="ktv-chat-primary"
              href={
                "/dang-nhap?returnTo=" +
                encodeURIComponent(
                  "/tin-nhan" + (provider ? "?provider=" + encodeURIComponent(provider) : ""),
                )
              }
            >
              Đăng nhập để nhắn tin <ArrowRight size={17} />
            </Link>
            <Link href="/dang-ky">Tạo tài khoản mới</Link>
          </div>
        ) : (
          <div className="ktv-chat-layout">
            <aside className="ktv-chat-sidebar" aria-label="Danh sách hội thoại và KTV">
              <div className="ktv-chat-sidebar-heading">
                <h2>{choosing ? "Chọn kỹ thuật viên" : "Tin nhắn"}</h2>
                {customer && (
                  <button
                    className="ktv-chat-icon-button"
                    aria-label="Chọn KTV để chat riêng"
                    onClick={pick}
                  >
                    <Plus size={21} />
                  </button>
                )}
              </div>
              <label className="ktv-chat-search">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={showDirectory ? "Tìm tên KTV, khu vực..." : "Tìm cuộc trò chuyện..."}
                />
              </label>
              {customer && (
                <div className="ktv-chat-tabs">
                  <button
                    className={!choosing ? "active" : ""}
                    onClick={() => {
                      setChoosing(false);
                      setSearch("");
                    }}
                  >
                    Hội thoại {threads.data?.length ? <span>{threads.data.length}</span> : null}
                  </button>
                  <button className={choosing ? "active" : ""} onClick={pick}>
                    Chọn KTV
                  </button>
                </div>
              )}
              {error && (
                <div className="ktv-chat-error" role="alert">
                  <p>{error}</p>
                  <button onClick={retry}>Thử kết nối lại</button>
                </div>
              )}
              <div className="ktv-chat-contacts">
                {threads.isPending ? (
                  <p className="ktv-chat-list-note" role="status">
                    Đang tải hội thoại...
                  </p>
                ) : showDirectory && customer ? (
                  <>
                    <p className="ktv-chat-list-note">
                      {choosing
                        ? "Nhắn trực tiếp với KTV bạn chọn"
                        : "Bạn chưa có tin nhắn. Chọn một KTV để bắt đầu."}
                    </p>
                    {directory.isPending ? (
                      <p className="ktv-chat-list-note">Đang tải KTV...</p>
                    ) : directory.isError ? (
                      <div className="ktv-chat-list-note">
                        Chưa tải được danh sách KTV.{" "}
                        <button onClick={() => void directory.refetch()}>Thử lại</button>
                      </div>
                    ) : filteredProviders.length ? (
                      filteredProviders.map((item) => (
                        <button
                          className="ktv-chat-contact"
                          key={item.id}
                          disabled={open.isPending || send.isPending}
                          onClick={() => {
                            const existing = threads.data?.find(
                              (thread) =>
                                thread.provider_application_id === item.id &&
                                thread.customer_user_id === user.id,
                            );
                            if (existing) select(existing);
                            else open.mutate(item.id);
                          }}
                        >
                          <span className="ktv-chat-avatar">{initials(item.publicName)}</span>
                          <span className="ktv-chat-contact-text">
                            <b>{item.publicName}</b>
                            <small>{item.title || "Kỹ thuật viên Mộc Maria"}</small>
                            <small>{item.serviceArea || "Trao đổi về dịch vụ và lịch hẹn"}</small>
                          </span>
                          {open.isPending && open.variables === item.id ? (
                            <LoaderCircle size={18} className="ktv-chat-spinner" />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="ktv-chat-list-empty">
                        <MessageCircle size={28} />
                        <b>{search ? "Chưa tìm thấy KTV" : "Chưa có KTV nhận tin nhắn"}</b>
                        <p>
                          {search
                            ? "Thử tìm bằng tên hoặc khu vực khác."
                            : "Danh sách sẽ xuất hiện khi KTV sẵn sàng tiếp nhận hội thoại."}
                        </p>
                      </div>
                    )}
                  </>
                ) : filteredThreads.length ? (
                  filteredThreads.map((thread) => (
                    <button
                      className={`ktv-chat-contact${current?.id === thread.id ? " active" : ""}`}
                      key={thread.id}
                      onClick={() => select(thread)}
                      aria-current={current?.id === thread.id ? "true" : undefined}
                    >
                      <span className="ktv-chat-avatar">{initials(recipient(thread))}</span>
                      <span className="ktv-chat-contact-text">
                        <b>{recipient(thread)}</b>
                        <small>{thread.last_message || "Gửi lời chào đầu tiên"}</small>
                      </span>
                      <span className="ktv-chat-contact-meta">
                        <time>{time(thread.updated_at)}</time>
                        {!!thread.unread_count && (
                          <span className="ktv-chat-unread">
                            {thread.unread_count > 99 ? "99+" : thread.unread_count}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="ktv-chat-list-empty">
                    <MessageCircle size={28} />
                    <b>{search ? "Không tìm thấy hội thoại" : "Chưa có cuộc trò chuyện"}</b>
                    <p>
                      {customer
                        ? "Chọn KTV để gửi lời chào đầu tiên."
                        : "Tin nhắn sẽ xuất hiện khi khách hàng liên hệ với bạn."}
                    </p>
                  </div>
                )}
              </div>
              <p className="ktv-chat-sidebar-footer">
                <ShieldCheck size={15} /> Chỉ hai người trong hội thoại được xem tin nhắn.
              </p>
            </aside>
            <section className="ktv-chat-dialog" aria-label="Nội dung hội thoại">
              {current && !choosing ? (
                <>
                  <header className="ktv-chat-recipient">
                    <button
                      className="ktv-chat-mobile-back ktv-chat-icon-button"
                      aria-label="Quay lại danh sách hội thoại"
                      onClick={() => {
                        setSelectedId(null);
                        setActionError("");
                      }}
                    >
                      <ArrowLeft size={22} />
                    </button>
                    <span className="ktv-chat-avatar">{initials(recipient(current))}</span>
                    <div>
                      <strong>{recipient(current)}</strong>
                      <small>
                        <ShieldCheck size={12} /> Hội thoại riêng giữa bạn và{" "}
                        {user.id === current.customer_user_id ? "KTV" : "khách hàng"}
                      </small>
                    </div>
                    {user.id === current.customer_user_id && (
                      <Link
                        className="ktv-chat-profile"
                        href={"/chuyen-vien/" + current.provider_application_id}
                      >
                        Xem hồ sơ <ChevronRight size={15} />
                      </Link>
                    )}
                  </header>
                  <div
                    className="ktv-chat-messages"
                    ref={messagesRef}
                    onScroll={() => {
                      const el = messagesRef.current;
                      if (el)
                        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                    }}
                    role="log"
                    aria-label="Tin nhắn"
                    aria-live="polite"
                  >
                    {history.hasNextPage && (
                      <button
                        className="ktv-chat-older"
                        disabled={history.isFetchingNextPage}
                        onClick={() => void history.fetchNextPage()}
                      >
                        {history.isFetchingNextPage ? "Đang tải..." : "Xem tin nhắn trước"}
                      </button>
                    )}
                    {history.isPending ? (
                      <div className="ktv-chat-intro" role="status">
                        <LoaderCircle className="ktv-chat-spinner" /> Đang tải tin nhắn...
                      </div>
                    ) : messages.length ? (
                      messages.map((item, index) => (
                        <div className="ktv-chat-message-row" key={item.id}>
                          {(!index ||
                            day(messages[index - 1].created_at) !== day(item.created_at)) && (
                            <p className="ktv-chat-date">{day(item.created_at)}</p>
                          )}
                          <div
                            className={`ktv-chat-bubble${item.sender_user_id === user.id ? " own" : ""}`}
                          >
                            <p>{item.body}</p>
                            <time dateTime={item.created_at}>{time(item.created_at)}</time>
                          </div>
                        </div>
                      ))
                    ) : (
                      !history.isError && (
                        <div className="ktv-chat-intro">
                          <span className="ktv-chat-hero-icon">
                            <MessageCircle size={28} />
                          </span>
                          <h2>Chào {recipient(current)}</h2>
                          <p>Bạn có thể hỏi về dịch vụ, nhu cầu chăm sóc hoặc thời gian phù hợp.</p>
                          {customer && (
                            <button
                              className="ktv-chat-suggestion"
                              onClick={() =>
                                setDrafts((old) => ({
                                  ...old,
                                  [current.id]:
                                    "Chào anh/chị, tôi muốn tìm hiểu thêm về dịch vụ chăm sóc.",
                                }))
                              }
                            >
                              Gửi một lời chào <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                  {error && (
                    <div className="ktv-chat-dialog-error" role="alert">
                      <p>{error}</p>
                      <button onClick={retry}>Thử lại</button>
                    </div>
                  )}
                  <form
                    className="ktv-chat-composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (draft.trim() && !send.isPending && !history.isPending && !history.isError)
                        send.mutate({ id: current.id, body: draft.trim() });
                    }}
                  >
                    <textarea
                      rows={1}
                      aria-label="Nội dung tin nhắn"
                      value={draft}
                      onChange={(event) =>
                        setDrafts((old) => ({ ...old, [current.id]: event.target.value }))
                      }
                      maxLength={2000}
                      placeholder={`Nhắn cho ${recipient(current)}...`}
                      disabled={send.isPending}
                    />
                    <button
                      type="submit"
                      disabled={
                        !draft.trim() || send.isPending || history.isPending || history.isError
                      }
                      aria-label="Gửi tin nhắn"
                    >
                      {send.isPending ? (
                        <LoaderCircle size={21} className="ktv-chat-spinner" />
                      ) : (
                        <Send size={21} />
                      )}
                    </button>
                    <small>Không chia sẻ mật khẩu hoặc thông tin thanh toán qua chat.</small>
                  </form>
                </>
              ) : (
                <div className="ktv-chat-welcome">
                  <span className="ktv-chat-hero-icon">
                    <MessageCircle size={38} />
                  </span>
                  <span className="ktv-chat-eyebrow">MỘC MARIA · LẮNG NGHE & CHĂM SÓC</span>
                  <h2>
                    Một lời chào,
                    <br />
                    thêm một kết nối.
                  </h2>
                  <p>
                    {customer
                      ? "Chọn một kỹ thuật viên để trao đổi về nhu cầu của bạn. Mỗi cuộc trò chuyện được lưu riêng để bạn dễ dàng tiếp tục bất cứ lúc nào."
                      : "Chọn hội thoại để trả lời khách hàng và trao đổi về dịch vụ."}
                  </p>
                  {customer && (
                    <button className="ktv-chat-primary" onClick={pick}>
                      Chọn KTV để trò chuyện <ArrowRight size={18} />
                    </button>
                  )}
                  <span className="ktv-chat-private">
                    <ShieldCheck size={16} /> Chỉ bạn và người nhận xem được tin nhắn
                  </span>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <MobileNavigation active="chat" />
    </div>
  );
}
