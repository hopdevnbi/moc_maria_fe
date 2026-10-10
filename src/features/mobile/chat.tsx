"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Smile,
  Volume2,
  VolumeX,
  LockKeyhole,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ChatProvider } from "@/features/marketplace/types";
import { chatHref } from "./links";
import { MobileHeader, MobileNavigation } from "./experience";
import "./chat.css";
import { ChatBlockControls, type ChatBlockState } from "./chat-block-controls";
import { IncomingChatTracker, useChatSound } from "./chat-sound";
import { ChatPrivacyControls, isChatLockedError, type ChatPrivacyState } from "./chat-privacy";

type Thread = ChatBlockState &
  ChatPrivacyState & {
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
  delivery?: "sending" | "failed" | "sent";
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

export function KtvChatPage({ provider, service }: { provider?: string; service?: string }) {
  const { status, user, authFetch } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [outbox, setOutbox] = useState<ChatMessage[]>([]);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const unlockTokens = useRef<Record<string, string>>({});
  const { muted, toggle: toggleSound, play: playSound } = useChatSound(user?.id);
  const incoming = useMemo(() => new IncomingChatTracker(user?.id), [user?.id]);
  const [serviceSelections, setServiceSelections] = useState<Record<string, string>>({});
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    queryFn: () => authFetch<ChatProvider[]>("/ktv-chat/providers", { cache: "no-store" }),
    enabled: enabled && customer,
    retry: 1,
  });
  const current = threads.data?.find((thread) => thread.id === selectedId) ?? null;
  const locked = !!current?.privacy_enabled && (!!current.history_locked || !unlocked[current.id]);
  const conceal = useCallback(
    (id: string) => {
      delete unlockTokens.current[id];
      setUnlocked((old) => ({ ...old, [id]: false }));
      setOutbox((old) => old.filter((m) => m.thread_id !== id));
      setDrafts((old) => ({ ...old, [id]: "" }));
      client.setQueryData<Thread[]>(["ktv-chat", user?.id, "threads"], (old) =>
        old?.map((t) =>
          t.id === id
            ? {
                ...t,
                privacy_enabled: true,
                history_locked: true,
                unlock_expires_at: null,
                last_message: null,
              }
            : t,
        ),
      );
      void client.cancelQueries({ queryKey: ["ktv-chat", user?.id, "messages", id] });
      client.removeQueries({ queryKey: ["ktv-chat", user?.id, "messages", id] });
    },
    [client, user?.id],
  );
  const applyPrivacy = (state: ChatPrivacyState) => {
    if (state.unlock_token) unlockTokens.current[state.id] = state.unlock_token;
    if (state.history_locked || !state.privacy_enabled) delete unlockTokens.current[state.id];
    setUnlocked((old) => ({ ...old, [state.id]: !state.history_locked && !!state.unlock_token }));
    client.setQueryData<Thread[]>([...key, "threads"], (old) =>
      old?.map((t) =>
        t.id === state.id
          ? {
              ...t,
              privacy_enabled: state.privacy_enabled,
              history_locked: state.history_locked,
              unlock_expires_at: state.unlock_expires_at,
              last_message: state.privacy_enabled ? null : t.last_message,
            }
          : t,
      ),
    );
    if (state.history_locked) conceal(state.id);
  };
  const leaving = () => {
    if (current?.privacy_enabled) {
      conceal(current.id);
      void authFetch(`/ktv-chat/threads/${current.id}/privacy/lock`, json({})).catch(() => {});
    }
  };
  useEffect(() => {
    const tokens = unlockTokens.current;
    return () => {
      for (const id of Object.keys(tokens)) {
        void authFetch(`/ktv-chat/threads/${id}/privacy/lock`, {
          ...json({}),
          keepalive: true,
        }).catch(() => {});
        delete tokens[id];
      }
      client.removeQueries({ queryKey: ["ktv-chat", user?.id, "messages"] });
    };
  }, [authFetch, client, user?.id]);
  const currentProvider = directory.data?.find((p) => p.id === current?.provider_application_id);
  const selectedService = current
    ? (serviceSelections[current.id] ??
      (current.provider_application_id === provider ? (service ?? "") : ""))
    : "";
  const consultationService = currentProvider?.services?.find((s) => s.id === selectedService);
  const returnTo = provider ? chatHref(provider, service) : "/tin-nhan";
  const paused =
    current?.can_send === false || !!current?.blocked_by_me || !!current?.blocked_by_other;
  const recipient = (thread: Thread) =>
    user?.id === thread.customer_user_id
      ? thread.provider_name || "KTV Mộc Maria"
      : thread.customer_name || "Khách hàng";
  const history = useInfiniteQuery({
    queryKey: [...key, "messages", selectedId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try {
        return await authFetch<ChatMessage[]>(
          `/ktv-chat/threads/${selectedId}/messages${pageParam ? "?before=" + pageParam : ""}`,
          {
            cache: "no-store",
            headers: unlockTokens.current[selectedId!]
              ? { "X-Chat-Unlock": unlockTokens.current[selectedId!] }
              : {},
          },
        );
      } catch (error) {
        if (selectedId && isChatLockedError(error)) conceal(selectedId);
        throw error;
      }
    },
    getNextPageParam: (page) => (page.length === 50 ? page[0].id : undefined),
    enabled: enabled && !!selectedId && !choosing && !locked,
    refetchInterval: 5000,
    retry: 1,
  });
  const messages = useMemo(() => {
    if (locked) return [];
    const seen = new Set<string>();
    const saved = [...(history.data?.pages ?? [])]
      .reverse()
      .flat()
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    return [...saved, ...outbox.filter((m) => m.thread_id === selectedId && !seen.has(m.id))];
  }, [history.data, outbox, selectedId, locked]);
  useEffect(() => {
    return client.getQueryCache().subscribe((event) => {
      const queryKey = event.query.queryKey;
      if (
        event.type !== "updated" ||
        event.action.type !== "success" ||
        queryKey[0] !== "ktv-chat" ||
        queryKey[1] !== user?.id ||
        queryKey[2] !== "messages"
      )
        return;
      const data = event.query.state.data as { pages: ChatMessage[][] } | undefined;
      const confirmed = new Set(data?.pages.flat().map((m) => m.id) ?? []);
      setOutbox((old) =>
        old.some((m) => m.delivery === "sent" && confirmed.has(m.id))
          ? old.filter((m) => m.delivery !== "sent" || !confirmed.has(m.id))
          : old,
      );
    });
  }, [client, user?.id]);
  const latestMessageId = history.data?.pages[0]?.at(-1)?.id;
  useEffect(() => {
    if (threads.data && incoming.inbox(threads.data, choosing ? null : selectedId)) playSound();
  }, [threads.data, selectedId, choosing, incoming, playSound]);
  useEffect(() => {
    const page = history.data?.pages[0];
    if (!locked && selectedId && user && page && incoming.history(selectedId, page, user.id))
      playSound();
  }, [history.data, selectedId, user, incoming, playSound, locked]);
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
    if (!enabled || !selectedId || !latestMessageId || choosing || locked) return;
    let disposed = false;
    void authFetch(`/ktv-chat/threads/${selectedId}/read`, {
      ...json({ lastMessageId: latestMessageId }),
      headers: {
        "Content-Type": "application/json",
        ...(unlockTokens.current[selectedId]
          ? { "X-Chat-Unlock": unlockTokens.current[selectedId] }
          : {}),
      },
    })
      .then(() => {
        if (!disposed)
          client.setQueryData<Thread[]>(["ktv-chat", user?.id, "threads"], (old) =>
            old?.map((thread) =>
              thread.id === selectedId ? { ...thread, unread_count: 0 } : thread,
            ),
          );
      })
      .catch((error) => {
        if (isChatLockedError(error)) conceal(selectedId);
      });
    return () => {
      disposed = true;
    };
  }, [
    enabled,
    selectedId,
    latestMessageId,
    choosing,
    authFetch,
    client,
    user?.id,
    locked,
    conceal,
  ]);
  useEffect(() => {
    if (nearBottom.current && messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, selectedId, choosing]);
  const send = useMutation({
    onMutate: ({ id, body }: { id: string; body: string }) => {
      const pending = pendingSend.current[`${id}:${body}`];
      const input =
        pending?.body === body ? pending : { body, clientMessageId: crypto.randomUUID() };
      pendingSend.current[`${id}:${body}`] = input;
      nearBottom.current = true;
      setActionError("");
      setDrafts((old) => (old[id]?.trim() === body ? { ...old, [id]: "" } : old));
      setOutbox((old) => [
        ...old.filter((m) => m.id !== input.clientMessageId),
        {
          id: input.clientMessageId,
          thread_id: id,
          sender_user_id: user!.id,
          body,
          created_at: new Date().toISOString(),
          delivery: "sending",
        },
      ]);
      return input;
    },
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      authFetch<ChatMessage>(`/ktv-chat/threads/${id}/messages`, {
        ...json(pendingSend.current[`${id}:${body}`]),
        headers: {
          "Content-Type": "application/json",
          ...(unlockTokens.current[id] ? { "X-Chat-Unlock": unlockTokens.current[id] } : {}),
        },
      }),
    onSuccess: (message, { id, body }, input) => {
      delete pendingSend.current[`${id}:${body}`];
      setOutbox((old) =>
        old.map((m) => (m.id === input?.clientMessageId ? { ...message, delivery: "sent" } : m)),
      );
      if (selectedId === id) setActionError("");
      void client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "messages", id] });
      void client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "threads"] });
    },
    onError: (error, { id, body }, input) => {
      if (isChatLockedError(error)) {
        conceal(id);
        return;
      }
      if (selectedId === id) setActionError(chatError(error));
      setDrafts((old) => (old[id] ? old : { ...old, [id]: body }));
      setOutbox((old) =>
        old.map((m) => (m.id === input?.clientMessageId ? { ...m, delivery: "failed" } : m)),
      );
    },
  });
  const showDirectory = choosing || !threads.data?.length;
  const query = normalize(search);
  const filteredThreads = (threads.data ?? []).filter((thread) =>
    normalize(recipient(thread)).includes(query),
  );
  const filteredProviders = (directory.data ?? []).filter(
    (item) =>
      !("isDemo" in item && item.isDemo === true) &&
      normalize(
        item.publicName +
          " " +
          (item.serviceArea ?? "") +
          " " +
          (item.services ?? []).map((s) => s.name).join(" "),
      ).includes(query),
  );
  const draft = selectedId ? (drafts[selectedId] ?? "") : "";
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "48px";
    input.style.height = `${Math.max(48, Math.min(input.scrollHeight, 120))}px`;
  }, [draft, selectedId, choosing]);
  const error =
    actionError ||
    (threads.isError || history.isError ? chatError(threads.error || history.error) : "");
  const select = (thread: Thread) => {
    if (current?.id !== thread.id) leaving();
    setSelectedId(thread.id);
    setChoosing(false);
    setActionError("");
    nearBottom.current = true;
  };
  const pick = () => {
    leaving();
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
            <h1>{user && !customer ? "Tin nhắn khách hàng" : "Trò chuyện cùng KTV"}</h1>
            <p>
              {user && !customer
                ? "Trả lời và tư vấn cho khách hàng. Mỗi khách, một cuộc trò chuyện riêng."
                : "Chọn kỹ thuật viên bạn tin tưởng. Mỗi người, một cuộc trò chuyện riêng."}
            </p>
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
              href={"/dang-nhap?returnTo=" + encodeURIComponent(returnTo)}
            >
              Đăng nhập để nhắn tin <ArrowRight size={17} />
            </Link>
            <Link href={"/dang-ky?returnTo=" + encodeURIComponent(returnTo)}>
              Tạo tài khoản mới
            </Link>
          </div>
        ) : (
          <div className="ktv-chat-layout">
            <aside className="ktv-chat-sidebar" aria-label="Danh sách hội thoại và KTV">
              <div className="ktv-chat-sidebar-heading">
                <h2>{choosing ? "Chọn kỹ thuật viên" : "Tin nhắn"}</h2>
                <button
                  type="button"
                  className="ktv-chat-icon-button"
                  onClick={toggleSound}
                  aria-label={muted ? "Bật âm báo tin nhắn" : "Tắt âm báo tin nhắn"}
                  aria-pressed={!muted}
                >
                  {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
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
                          <span className="ktv-chat-avatar">
                            {item.avatarUrl ? (
                              <Image
                                src={item.avatarUrl}
                                alt=""
                                width={48}
                                height={56}
                                unoptimized
                              />
                            ) : (
                              initials(item.publicName)
                            )}
                          </span>
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
                        <small>
                          {thread.privacy_enabled ? (
                            <>
                              <LockKeyhole size={12} /> Hội thoại có mật khẩu
                            </>
                          ) : (
                            thread.last_message || "Gửi lời chào đầu tiên"
                          )}
                        </small>
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
                        leaving();
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
                        href={
                          "/chuyen-vien/" +
                          (currentProvider?.publicAlias || current.provider_application_id)
                        }
                      >
                        Xem hồ sơ <ChevronRight size={15} />
                      </Link>
                    )}
                    <button
                      type="button"
                      className="ktv-chat-icon-button"
                      onClick={toggleSound}
                      aria-label={muted ? "Bật âm báo hội thoại" : "Tắt âm báo hội thoại"}
                      aria-pressed={!muted}
                    >
                      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </header>
                  {customer && current.customer_user_id === user.id && (
                    <ChatPrivacyControls
                      key={current.id}
                      thread={{ ...current, history_locked: locked }}
                      onState={applyPrivacy}
                      onConceal={() => conceal(current.id)}
                    />
                  )}
                  {!locked && (
                    <>
                      {customer && !!currentProvider?.services?.length && (
                        <label className="ktv-chat-service">
                          <span>Dịch vụ cần tư vấn</span>
                          <select
                            aria-label="Chọn dịch vụ để tư vấn"
                            value={selectedService}
                            onChange={(e) =>
                              setServiceSelections((old) => ({
                                ...old,
                                [current.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Tư vấn chung</option>
                            {currentProvider.services.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          {consultationService && (
                            <button
                              type="button"
                              disabled={paused}
                              onClick={() =>
                                setDrafts((old) => ({
                                  ...old,
                                  [current.id]: `Chào ${recipient(current)}, tôi muốn được tư vấn về ${consultationService.name}. Bạn giúp tôi chọn thời gian phù hợp nhé.`,
                                }))
                              }
                            >
                              Soạn câu hỏi
                            </button>
                          )}
                        </label>
                      )}
                      <div className="ktv-chat-block-status">
                        <ChatBlockControls
                          key={current.id}
                          thread={current}
                          name={recipient(current)}
                        />
                        {paused ? (
                          <p>
                            {current.blocked_by_me
                              ? "Bạn đang chặn hội thoại. Mở quản lý chặn để mở lại."
                              : current.blocked_by_other
                                ? "Người kia đang chặn hội thoại."
                                : "Hội thoại tạm ngừng nhận tin nhắn mới."}{" "}
                            {current.blocked_by_me &&
                              current.my_block_expires_at &&
                              `Tự mở lại: ${new Date(current.my_block_expires_at).toLocaleString("vi-VN")}.`}{" "}
                            {current.blocked_by_me &&
                              current.blocked_by_other &&
                              "Người kia cũng đang chặn."}{" "}
                            Bạn vẫn xem được lịch sử.
                          </p>
                        ) : (
                          <small>Quản lý chặn hội thoại</small>
                        )}
                      </div>
                      <div
                        className="ktv-chat-messages"
                        ref={messagesRef}
                        onScroll={() => {
                          const el = messagesRef.current;
                          if (el)
                            nearBottom.current =
                              el.scrollHeight - el.scrollTop - el.clientHeight < 100;
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
                                {item.delivery && (
                                  <small className="ktv-chat-delivery">
                                    {item.delivery === "sending"
                                      ? "Đang gửi…"
                                      : item.delivery === "sent"
                                        ? "Đã gửi"
                                        : "Chưa gửi được"}
                                    {item.delivery === "failed" && (
                                      <button
                                        type="button"
                                        disabled={paused || send.isPending}
                                        onClick={() =>
                                          send.mutate({ id: item.thread_id, body: item.body })
                                        }
                                      >
                                        Gửi lại
                                      </button>
                                    )}
                                  </small>
                                )}
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
                              <p>
                                Bạn có thể hỏi về dịch vụ, nhu cầu chăm sóc hoặc thời gian phù hợp.
                              </p>
                              {customer && !paused && (
                                <button
                                  className="ktv-chat-suggestion"
                                  onClick={() =>
                                    setDrafts((old) => ({
                                      ...old,
                                      [current.id]: consultationService
                                        ? `Chào ${recipient(current)}, tôi muốn được tư vấn về ${consultationService.name}.`
                                        : "Chào anh/chị, tôi muốn tìm hiểu thêm về dịch vụ chăm sóc.",
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
                          if (
                            !paused &&
                            draft.trim() &&
                            !send.isPending &&
                            !history.isPending &&
                            !history.isError
                          )
                            send.mutate({ id: current.id, body: draft.trim() });
                        }}
                      >
                        {emojiFor === current.id && !paused && (
                          <div
                            className="ktv-chat-emoji-picker"
                            id="ktv-chat-emojis"
                            aria-label="Biểu cảm"
                          >
                            {[
                              "😊",
                              "❤️",
                              "👍",
                              "🙏",
                              "🌿",
                              "✨",
                              "😄",
                              "😍",
                              "🥰",
                              "🤗",
                              "😌",
                              "💐",
                              "👌",
                              "👋",
                              "💚",
                              "🎉",
                              "🤔",
                              "😅",
                              "🙌",
                              "☀️",
                            ].map((emoji) => (
                              <button
                                type="button"
                                key={emoji}
                                aria-label={"Chèn biểu cảm " + emoji}
                                onClick={() => {
                                  const start = inputRef.current?.selectionStart ?? draft.length;
                                  const end = inputRef.current?.selectionEnd ?? draft.length;
                                  const next = draft.slice(0, start) + emoji + draft.slice(end);
                                  if (next.length > 2000) return;
                                  setDrafts((old) => ({ ...old, [current.id]: next }));
                                  setEmojiFor(null);
                                  requestAnimationFrame(() => {
                                    inputRef.current?.focus();
                                    inputRef.current?.setSelectionRange(
                                      start + emoji.length,
                                      start + emoji.length,
                                    );
                                  });
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          className="ktv-chat-emoji-toggle"
                          disabled={paused}
                          aria-label="Chọn biểu cảm"
                          aria-expanded={emojiFor === current.id}
                          aria-controls="ktv-chat-emojis"
                          onClick={() =>
                            setEmojiFor((old) => (old === current.id ? null : current.id))
                          }
                        >
                          <Smile size={22} />
                        </button>
                        <textarea
                          ref={inputRef}
                          rows={1}
                          aria-label="Nội dung tin nhắn"
                          value={draft}
                          onChange={(event) =>
                            setDrafts((old) => ({ ...old, [current.id]: event.target.value }))
                          }
                          maxLength={2000}
                          placeholder={`Nhắn cho ${recipient(current)}...`}
                          disabled={paused}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setEmojiFor(null);
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              event.currentTarget.form?.requestSubmit();
                            }
                          }}
                        />
                        <button
                          type="submit"
                          disabled={
                            paused ||
                            !draft.trim() ||
                            send.isPending ||
                            history.isPending ||
                            history.isError
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
                  )}
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
