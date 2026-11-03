"use client";
import { providerProfileHref } from "./provider-slugs";

import Link from "next/link";
import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ChevronRight,
  ImagePlus,
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
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingState, PendingLabel } from "@/shared/loading/loading-state";
import type { ChatProvider } from "@/features/marketplace/types";
import { chatHref } from "./links";
import { officialServiceLabel } from "./official-ktv-offers";
import { MobileHeader, MobileNavigation } from "./experience";
import "./chat.css";
import { ChatBlockControls, type ChatBlockState } from "./chat-block-controls";
import { IncomingChatTracker, useChatSound } from "./chat-sound";
import { chatViewportGeometry } from "./chat-viewport";
import { KtvChatPushControl } from "./chat-notifications";
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
  image_url?: string | null;
  created_at: string;
  delivery?: "sending" | "failed" | "sent";
  deliveryError?: string;
};
type ImageAttachment = { threadId: string; file: File; previewUrl: string };
type SendInput = {
  id: string;
  body: string;
  clientMessageId: string;
  imageUrl?: string;
  attachment?: ImageAttachment;
};
const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;
const CHAT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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
const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});
const dayFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const time = (value: string) => timeFormatter.format(new Date(value));
const day = (value: string) => dayFormatter.format(new Date(value));
function pause(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
  });
}
const ChatMessageRow = memo(function ChatMessageRow({
  item,
  own,
  showDate,
  retryDisabled,
  retry,
}: {
  item: ChatMessage;
  own: boolean;
  showDate: boolean;
  retryDisabled: boolean;
  retry: (item: ChatMessage) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);
  return (
    <div className="ktv-chat-message-row">
      {showDate && <p className="ktv-chat-date">{day(item.created_at)}</p>}
      <div
        className={`ktv-chat-bubble${own ? " own" : ""}${item.delivery === "sending" ? " is-sending" : ""}`}
      >
        {item.body && <p>{item.body}</p>}
        {item.image_url && (
          <button
            type="button"
            className="ktv-chat-image-open"
            aria-label="Xem ảnh đính kèm lớn"
            onClick={() => setExpanded(true)}
          >
            <Image
              src={item.image_url}
              alt="Ảnh đính kèm trong tin nhắn"
              unoptimized
              width={320}
              height={320}
            />
          </button>
        )}
        <time dateTime={item.created_at}>{time(item.created_at)}</time>
        {item.delivery && (
          <small className="ktv-chat-delivery">
            {item.delivery === "sending"
              ? "Đang gửi…"
              : item.delivery === "sent"
                ? "Đã gửi"
                : "Chưa gửi được"}
            {item.delivery === "failed" && (
              <button type="button" disabled={retryDisabled} onClick={() => retry(item)}>
                Gửi lại
              </button>
            )}
          </small>
        )}
        {item.delivery === "failed" && item.deliveryError && (
          <span className="ktv-chat-delivery-error" role="status">
            {item.deliveryError}
          </span>
        )}
      </div>
      {expanded && item.image_url && (
        <div
          className="ktv-chat-image-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh đính kèm phóng to"
          onClick={(event) => {
            if (event.target === event.currentTarget) setExpanded(false);
          }}
        >
          <button type="button" aria-label="Đóng ảnh lớn" onClick={() => setExpanded(false)}>
            <X size={24} />
          </button>
          <Image
            src={item.image_url}
            alt="Ảnh đính kèm phóng to"
            unoptimized
            width={1600}
            height={1200}
          />
        </div>
      )}
    </div>
  );
});
function chatError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "CHAT_RECEIVER_MISMATCH")
    return "Chưa mở đúng KTV bạn chọn. Hãy thử chọn lại KTV.";
  if (
    message.includes("chỉ cho phép xem lịch sử") ||
    message.includes("quá nhanh") ||
    message.includes("chính mình")
  )
    return message;
  return "Chưa kết nối được chat. Vui lòng thử lại sau ít phút.";
}

export function KtvChatPage({
  provider,
  service,
  threadId,
}: {
  provider?: string;
  service?: string;
  threadId?: string;
}) {
  const { status, user, authFetch } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<ImageAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
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
  const openedThread = useRef("");
  const selectionVersion = useRef(0);
  const failedOpening = useRef<{ id: string; name: string } | null>(null);
  const [openingProvider, setOpeningProvider] = useState<{ id: string; name: string } | null>(null);
  const [showLatest, setShowLatest] = useState(false);
  const nearBottom = useRef(true);
  const olderScroll = useRef<{ id: string; height: number; top: number } | null>(null);
  const pendingSend = useRef<Record<string, SendInput>>({});
  const inFlight = useRef(new Set<string>());
  const previewUrls = useRef(new Set<string>());
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
    select: (providers) =>
      providers.map((provider) => ({
        ...provider,
        services: (provider.services || []).map(officialServiceLabel),
      })),
    enabled: enabled && customer,
    staleTime: 60_000,
    retry: 1,
  });
  // Public KTV cards use presentation aliases; the private Chat API requires the
  // actual provider-application UUID returned by the Chat directory.
  const receiverId = provider
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(provider)
      ? provider
      : directory.data?.find((item) => item.id === provider || item.publicAlias === provider)?.id
    : undefined;
  const current = threads.data?.find((thread) => thread.id === selectedId) ?? null;
  useEffect(() => {
    if (!threadId || !threads.data?.some((thread) => thread.id === threadId)) return;
    if (openedThread.current === threadId) return;
    openedThread.current = threadId;
    setSelectedId(threadId);
    setChoosing(false);
    nearBottom.current = true;
  }, [threadId, threads.data]);
  useEffect(() => {
    const used = new Set([
      attachment?.previewUrl,
      ...outbox.map((message) => message.image_url),
      ...Object.values(pendingSend.current).map((input) => input.attachment?.previewUrl),
    ]);
    for (const url of previewUrls.current) {
      if (!used.has(url)) {
        URL.revokeObjectURL(url);
        previewUrls.current.delete(url);
      }
    }
  }, [attachment, outbox]);
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  const locked = !!current?.privacy_enabled && (!!current.history_locked || !unlocked[current.id]);
  const conceal = useCallback(
    (id: string) => {
      delete unlockTokens.current[id];
      setUnlocked((old) => ({ ...old, [id]: false }));
      for (const [key, input] of Object.entries(pendingSend.current)) {
        if (input.id === id) delete pendingSend.current[key];
      }
      setOutbox((old) => old.filter((m) => m.thread_id !== id));
      setAttachment((old) => (old?.threadId === id ? null : old));
      setAttachmentError("");
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
      (current.provider_application_id === receiverId ? (service ?? "") : ""))
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
    queryFn: async ({ pageParam, signal }) => {
      try {
        return await authFetch<ChatMessage[]>(
          `/ktv-chat/threads/${selectedId}/messages${pageParam ? "?before=" + pageParam : ""}`,
          {
            cache: "no-store",
            signal,
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
    getNextPageParam: (page) => (page.length >= 50 ? page[0].id : undefined),
    enabled: enabled && !!selectedId && !choosing && !locked,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
  });
  const historyReady = history.isSuccess;
  useEffect(() => {
    if (!enabled || !selectedId || choosing || locked || !historyReady) return;
    const cancellation = new AbortController();
    const historyKey = ["ktv-chat", user?.id, "messages", selectedId];
    const poll = async () => {
      while (!cancellation.signal.aborted) {
        if (document.visibilityState === "hidden") {
          await pause(1000, cancellation.signal);
          continue;
        }
        const cached = client.getQueryData<InfiniteData<ChatMessage[]>>(historyKey);
        const after = cached?.pages[0]?.at(-1)?.id;
        try {
          const added = await authFetch<ChatMessage[]>(
            `/ktv-chat/threads/${selectedId}/updates${after ? "?after=" + after : ""}`,
            {
              cache: "no-store",
              signal: cancellation.signal,
              headers: unlockTokens.current[selectedId]
                ? { "X-Chat-Unlock": unlockTokens.current[selectedId] }
                : {},
            },
          );
          if (cancellation.signal.aborted) return;
          if (added.length) {
            client.setQueryData<InfiniteData<ChatMessage[]>>(historyKey, (old) => {
              if (!old) return old;
              const seen = new Set(old.pages.flat().map((message) => message.id));
              return {
                ...old,
                pages: [
                  [...old.pages[0], ...added.filter((message) => !seen.has(message.id))],
                  ...old.pages.slice(1),
                ],
              };
            });
            void client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "threads"] });
          }
          // Avoid tight loops against an old API or an immediately resolving transport.
          await pause(added.length === 50 ? 0 : 100, cancellation.signal);
        } catch (error) {
          if (cancellation.signal.aborted) return;
          if (isChatLockedError(error)) {
            conceal(selectedId);
            return;
          }
          await pause(4000, cancellation.signal);
        }
      }
    };
    void poll();
    return () => {
      cancellation.abort();
    };
  }, [enabled, selectedId, choosing, locked, historyReady, user?.id, authFetch, client, conceal]);
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
  useLayoutEffect(() => {
    const anchor = olderScroll.current;
    const element = messagesRef.current;
    if (anchor && element && anchor.id === selectedId && !history.isFetchingNextPage) {
      element.scrollTop = anchor.top + element.scrollHeight - anchor.height;
      olderScroll.current = null;
    }
  }, [history.data, history.isFetchingNextPage, selectedId]);
  useEffect(() => {
    return client.getQueryCache().subscribe((event) => {
      const queryKey = event.query.queryKey;
      if (
        event.type !== "updated" ||
        event.action.type !== "success" ||
        queryKey[0] !== "ktv-chat" ||
        queryKey[1] !== user?.id
      )
        return;
      if (queryKey[2] === "threads") {
        const data = event.query.state.data as Thread[] | undefined;
        for (const thread of data ?? []) {
          if (
            thread.privacy_enabled &&
            thread.history_locked &&
            (unlockTokens.current[thread.id] ||
              Object.values(pendingSend.current).some((input) => input.id === thread.id))
          )
            conceal(thread.id);
        }
        return;
      }
      if (queryKey[2] !== "messages") return;
      const data = event.query.state.data as { pages: ChatMessage[][] } | undefined;
      const confirmed = new Set(data?.pages.flat().map((m) => m.id) ?? []);
      setOutbox((old) =>
        old.some((m) => m.delivery === "sent" && confirmed.has(m.id))
          ? old.filter((m) => m.delivery !== "sent" || !confirmed.has(m.id))
          : old,
      );
    });
  }, [client, user?.id, conceal]);
  const latestMessageId = history.data?.pages[0]?.at(-1)?.id;
  useEffect(() => {
    if (threads.data && incoming.inbox(threads.data, choosing ? null : selectedId)) playSound();
  }, [threads.data, selectedId, choosing, incoming, playSound]);
  useEffect(() => {
    const page = history.data?.pages[0];
    if (!locked && selectedId && user && page && incoming.history(selectedId, page, user.id))
      playSound();
  }, [history.data, selectedId, user, incoming, playSound, locked]);
  const leaveForNavigation = useEffectEvent(leaving);
  const requestedProviderName = useEffectEvent(
    (id: string) => directory.data?.find((item) => item.id === id)?.publicName ?? "KTV bạn chọn",
  );
  const open = useMutation({
    mutationFn: async ({ id, version }: { id: string; version: number; name: string }) => {
      if (selectionVersion.current !== version) throw new Error("CHAT_OPEN_CANCELLED");
      const existing = client
        .getQueryData<Thread[]>([...key, "threads"])
        ?.find(
          (thread) => thread.provider_application_id === id && thread.customer_user_id === user?.id,
        );
      const thread =
        existing ??
        (await authFetch<Thread>("/ktv-chat/threads", json({ providerApplicationId: id })));
      if (thread.provider_application_id !== id || thread.customer_user_id !== user?.id)
        throw new Error("CHAT_RECEIVER_MISMATCH");
      return thread;
    },
    onMutate: (request) => {
      if (selectionVersion.current !== request.version) return;
      failedOpening.current = null;
      setSelectedId(null);
      setChoosing(false);
      setSearch("");
      setActionError("");
      setOpeningProvider({ id: request.id, name: request.name });
      nearBottom.current = true;
    },
    onSuccess: (thread, request) => {
      if (selectionVersion.current !== request.version || thread.customer_user_id !== user?.id)
        return;
      client.setQueryData<Thread[]>([...key, "threads"], (old) => [
        thread,
        ...(old ?? []).filter((item) => item.id !== thread.id),
      ]);
      openedProvider.current = user?.id + ":" + request.id;
      setOpeningProvider(null);
      setSelectedId(thread.id);
      setChoosing(false);
      setSearch("");
      setActionError("");
      nearBottom.current = true;
    },
    onError: (error, request) => {
      if (selectionVersion.current !== request.version) return;
      openedProvider.current = "";
      failedOpening.current = { id: request.id, name: request.name };
      setOpeningProvider(null);
      setActionError(chatError(error));
    },
  });
  const { mutate: openThread } = open;
  useEffect(() => {
    if (!enabled || !customer || !provider) return;
    // Wait for the directory before resolving public aliases. Never POST a
    // presentation slug/demo ID to a PostgreSQL UUID field.
    if (!receiverId) return;
    const requested = user?.id + ":" + receiverId;
    if (openedProvider.current === requested) return;
    const navigation = selectionVersion;
    const version = ++navigation.current;
    leaveForNavigation();
    openThread({ id: receiverId, name: requestedProviderName(receiverId), version });
    return () => {
      if (navigation.current === version) ++navigation.current;
    };
  }, [enabled, customer, provider, receiverId, user?.id, deepLinkAttempt, openThread]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const viewport = window.visualViewport;
    const keyboard = (
      navigator as Navigator & {
        virtualKeyboard?: EventTarget & {
          boundingRect?: DOMRectReadOnly;
          overlaysContent?: boolean;
        };
      }
    ).virtualKeyboard;
    // Let the browser resize content where supported. Still handle overlay
    // keyboards explicitly because the PWA/browser may ignore this setting.
    if (keyboard) {
      try {
        keyboard.overlaysContent = false;
      } catch {
        // Older browsers expose the geometry but not the resize preference.
      }
    }
    let restingHeight = Math.max(
      window.innerHeight,
      (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0),
    );
    let lastWidth = window.innerWidth;
    let frame = 0;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const measure = () => {
      const focused = document.activeElement === inputRef.current && !!inputRef.current;
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        restingHeight = Math.max(window.innerHeight, height + top);
      } else if (!focused) {
        // Keep the taller resting viewport while the keyboard is closing.
        restingHeight = Math.max(restingHeight, window.innerHeight, height + top);
      }
      const rect = keyboard?.boundingRect;
      const geometry = chatViewportGeometry({
        viewportHeight: height,
        viewportTop: top,
        layoutHeight: window.innerHeight,
        restingHeight,
        keyboardTop: rect?.top,
        keyboardHeight: rect?.height,
        focused,
      });
      shell.style.setProperty("--ktv-chat-height", `${geometry.height}px`);
      shell.style.setProperty("--ktv-chat-top", `${geometry.top}px`);
      if (focused) shell.dataset.composerFocused = "true";
      else delete shell.dataset.composerFocused;
      if (geometry.keyboardOpen) shell.dataset.keyboardOpen = "true";
      else delete shell.dataset.keyboardOpen;
      if (focused && nearBottom.current && messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const onFocusChange = (event: FocusEvent) => {
      if (event.target !== inputRef.current) return;
      for (const timer of timers) clearTimeout(timer);
      timers.length = 0;
      schedule();
      // Safari and Android WebView animate their keyboards after focus has
      // fired; re-measure at the end without changing draft or focus state.
      for (const delay of [80, 240, 420]) timers.push(setTimeout(schedule, delay));
    };
    measure();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    keyboard?.addEventListener("geometrychange", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", schedule);
    shell.addEventListener("focusin", onFocusChange);
    shell.addEventListener("focusout", onFocusChange);
    return () => {
      cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      keyboard?.removeEventListener("geometrychange", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", schedule);
      shell.removeEventListener("focusin", onFocusChange);
      shell.removeEventListener("focusout", onFocusChange);
      delete shell.dataset.keyboardOpen;
      delete shell.dataset.composerFocused;
    };
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
    if (nearBottom.current && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      setShowLatest(false);
    }
  }, [messages, selectedId, choosing]);
  const send = useMutation({
    // Keep server order while every queued message is already visible locally.
    scope: { id: `ktv-chat-send:${user?.id}` },
    onMutate: (input: SendInput) => {
      if (pendingSend.current[input.clientMessageId] !== input) return;
      const { id, body, clientMessageId, imageUrl, attachment: image } = input;
      nearBottom.current = true;
      setActionError("");
      setAttachmentError("");
      setDrafts((old) => (old[id]?.trim() === body ? { ...old, [id]: "" } : old));
      if (image) setAttachment((old) => (old === image ? null : old));
      setOutbox((old) => {
        const existing = old.find((message) => message.id === clientMessageId);
        const message: ChatMessage = {
          id: clientMessageId,
          thread_id: id,
          sender_user_id: user!.id,
          body,
          image_url: imageUrl ?? image?.previewUrl ?? null,
          created_at: existing?.created_at ?? new Date().toISOString(),
          delivery: "sending",
        };
        return existing
          ? old.map((item) => (item.id === clientMessageId ? message : item))
          : [...old, message];
      });
    },
    mutationFn: async (input: SendInput) => {
      const { id, body, clientMessageId } = input;
      const headers = (): Record<string, string> =>
        unlockTokens.current[id] ? { "X-Chat-Unlock": unlockTokens.current[id] } : {};
      const assertVisible = () => {
        if (pendingSend.current[clientMessageId] !== input) throw new Error("CHAT_SEND_CANCELLED");
      };
      assertVisible();
      if (input.attachment && !input.imageUrl) {
        const data = new FormData();
        data.append("file", input.attachment.file);
        const uploaded = await authFetch<{ url: string }>(`/ktv-chat/threads/${id}/images`, {
          method: "POST",
          body: data,
          headers: headers(),
        });
        if (!uploaded?.url) throw new Error("UPLOAD_MISSING_URL");
        // Retain the uploaded URL if saving the message fails; retry only the save.
        input.imageUrl = uploaded.url;
      }
      assertVisible();
      return authFetch<ChatMessage>(`/ktv-chat/threads/${id}/messages`, {
        ...json({ body, clientMessageId, ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}) }),
        headers: { "Content-Type": "application/json", ...headers() },
      });
    },
    onSuccess: (message, input) => {
      if (pendingSend.current[input.clientMessageId] !== input) return;
      delete pendingSend.current[input.clientMessageId];
      setOutbox((old) =>
        old.map((item) =>
          item.id === input.clientMessageId
            ? {
                ...item,
                ...message,
                image_url: message.image_url ?? input.imageUrl,
                delivery: "sent",
              }
            : item,
        ),
      );
      void client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "threads"] });
    },
    onError: (error, input) => {
      if (pendingSend.current[input.clientMessageId] !== input) return;
      if (isChatLockedError(error)) {
        conceal(input.id);
        return;
      }
      // The failed bubble owns its image and retry action, independent of the next draft.
      if (!input.attachment)
        setDrafts((old) => (old[input.id] ? old : { ...old, [input.id]: input.body }));
      setOutbox((old) =>
        old.map((item) =>
          item.id === input.clientMessageId
            ? {
                ...item,
                delivery: "failed",
                deliveryError: chatError(error).startsWith("Chưa kết nối được chat")
                  ? "Kiểm tra kết nối rồi chạm Gửi lại."
                  : chatError(error),
              }
            : item,
        ),
      );
    },
    onSettled: (_message, _error, input) => {
      inFlight.current.delete(input.clientMessageId);
    },
  });
  const { mutate: sendMessage } = send;
  const enqueue = useCallback(
    (input: SendInput) => {
      if (inFlight.current.has(input.clientMessageId)) return;
      pendingSend.current[input.clientMessageId] = input;
      inFlight.current.add(input.clientMessageId);
      sendMessage(input);
    },
    [sendMessage],
  );
  const resend = useCallback(
    (item: ChatMessage) => {
      const input = pendingSend.current[item.id];
      if (input) enqueue(input);
    },
    [enqueue],
  );
  const chooseImage = (file?: File) => {
    if (!file || !selectedId) return;
    if (!CHAT_IMAGE_TYPES.has(file.type)) {
      setAttachmentError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setAttachmentError("Dung lượng ảnh tối đa là 5 MB.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrls.current.add(previewUrl);
    setAttachment({ threadId: selectedId, file, previewUrl });
    setAttachmentError("");
  };
  const submitMessage = (id: string, body: string) => {
    const image = attachment?.threadId === id ? attachment : undefined;
    if (!body && !image) return;
    const failed = !image
      ? Object.values(pendingSend.current).find(
          (input) =>
            input.id === id &&
            input.body === body &&
            !input.attachment &&
            !inFlight.current.has(input.clientMessageId),
        )
      : undefined;
    enqueue(failed ?? { id, body, clientMessageId: crypto.randomUUID(), attachment: image });
    inputRef.current?.focus();
  };
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
  // Background refresh errors must not hide a usable cached inbox/history.
  const unresolvedProvider =
    enabled && customer && !!provider && !receiverId && !directory.isPending && !directory.isError;
  const error =
    (enabled && !customer && provider
      ? "Tài khoản này dùng để trả lời khách hàng, chưa có quyền bắt đầu trò chuyện với KTV khác. Hãy dùng tài khoản khách hàng để nhận tư vấn."
      : "") ||
    actionError ||
    (unresolvedProvider
      ? "Không tìm thấy KTV này trong danh sách chat. Hãy chọn KTV khác."
      : threads.isError && !threads.data
        ? chatError(threads.error)
        : history.isError && !history.data
          ? chatError(history.error)
          : "");
  const select = (thread: Thread) => {
    ++selectionVersion.current;
    failedOpening.current = null;
    setOpeningProvider(null);
    if (current?.id !== thread.id) leaving();
    if (current?.id !== thread.id) {
      setAttachment(null);
      setAttachmentError("");
    }
    setSelectedId(thread.id);
    setChoosing(false);
    setSearch("");
    setShowLatest(false);
    setActionError("");
    nearBottom.current = true;
  };
  const pick = () => {
    ++selectionVersion.current;
    failedOpening.current = null;
    setOpeningProvider(null);
    leaving();
    setAttachment(null);
    setAttachmentError("");
    setChoosing(true);
    setSearch("");
    setActionError("");
  };
  const retry = () => {
    setActionError("");
    void threads.refetch();
    void directory.refetch();
    if (selectedId) void history.refetch();
    const failed = failedOpening.current;
    if (failed) openThread({ ...failed, version: ++selectionVersion.current });
    else if (provider && !selectedId) setDeepLinkAttempt((old) => old + 1);
  };

  return (
    <div
      ref={shellRef}
      className={`mobile-experience ktv-chat-shell${(current && !choosing) || openingProvider ? " is-conversation" : ""}`}
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
          <LoadingState
            title="Đang mở không gian trò chuyện"
            description="Mộc đang kiểm tra tài khoản và chuẩn bị hội thoại của bạn."
            shape="messages"
          />
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
              <KtvChatPushControl />
              <label className="ktv-chat-search">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    showDirectory && customer ? "Tìm tên KTV, khu vực..." : "Tìm cuộc trò chuyện..."
                  }
                  aria-label={
                    showDirectory && customer ? "Tìm kỹ thuật viên" : "Tìm cuộc trò chuyện"
                  }
                  type="search"
                />
              </label>
              {customer && (
                <div className="ktv-chat-tabs">
                  <button
                    className={!choosing ? "active" : ""}
                    onClick={() => {
                      setChoosing(false);
                      setSearch("");
                      ++selectionVersion.current;
                      setOpeningProvider(null);
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
                  {(customer || !provider) && <button onClick={retry}>Thử kết nối lại</button>}
                </div>
              )}
              <div className="ktv-chat-contacts">
                {threads.isPending ? (
                  <LoadingState compact title="Đang tải hội thoại…" description="" shape="list" />
                ) : showDirectory && customer ? (
                  <>
                    <p className="ktv-chat-list-note">
                      {choosing
                        ? "Nhắn trực tiếp với KTV bạn chọn"
                        : "Bạn chưa có tin nhắn. Chọn một KTV để bắt đầu."}
                    </p>
                    {directory.isPending ? (
                      <LoadingState
                        compact
                        title="Đang tìm KTV của bạn…"
                        description=""
                        shape="list"
                      />
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
                          onClick={() => {
                            const existing = threads.data?.find(
                              (thread) =>
                                thread.provider_application_id === item.id &&
                                thread.customer_user_id === user.id,
                            );
                            if (existing) select(existing);
                            else {
                              leaving();
                              const version = ++selectionVersion.current;
                              setSelectedId(null);
                              setChoosing(false);
                              setActionError("");
                              setSearch("");
                              setOpeningProvider({ id: item.id, name: item.publicName });
                              open.mutate({ id: item.id, name: item.publicName, version });
                            }
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
                          {openingProvider?.id === item.id ? (
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
              {openingProvider ? (
                <div className="ktv-chat-opening" role="status">
                  <button
                    type="button"
                    className="ktv-chat-icon-button"
                    aria-label="Hủy mở hội thoại"
                    onClick={() => {
                      ++selectionVersion.current;
                      setOpeningProvider(null);
                      setActionError("");
                    }}
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <LoadingState
                    title={`Đang mở trò chuyện với ${openingProvider.name}`}
                    description="Chuẩn bị hội thoại riêng của bạn…"
                    shape="messages"
                  />
                </div>
              ) : current && !choosing ? (
                <>
                  <header className="ktv-chat-recipient">
                    <button
                      className="ktv-chat-mobile-back ktv-chat-icon-button"
                      aria-label="Quay lại danh sách hội thoại"
                      onClick={() => {
                        leaving();
                        ++selectionVersion.current;
                        setOpeningProvider(null);
                        setSelectedId(null);
                        setActionError("");
                      }}
                    >
                      <ArrowLeft size={22} />
                    </button>
                    <span className="ktv-chat-avatar">
                      {user.id === current.customer_user_id && currentProvider?.avatarUrl ? (
                        <Image
                          src={currentProvider.avatarUrl}
                          alt=""
                          width={46}
                          height={46}
                          unoptimized
                        />
                      ) : (
                        initials(recipient(current))
                      )}
                    </span>
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
                        href={providerProfileHref({
                          id: currentProvider?.publicAlias || current.provider_application_id,
                          publicName: recipient(current),
                        })}
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
                          if (el) {
                            nearBottom.current =
                              el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                            setShowLatest(!nearBottom.current);
                          }
                        }}
                        role="log"
                        aria-label="Tin nhắn"
                        aria-live="polite"
                      >
                        {history.hasNextPage && (
                          <button
                            className="ktv-chat-older"
                            disabled={history.isFetchingNextPage}
                            onClick={() => {
                              nearBottom.current = false;
                              const element = messagesRef.current;
                              if (element && selectedId)
                                olderScroll.current = {
                                  id: selectedId,
                                  height: element.scrollHeight,
                                  top: element.scrollTop,
                                };
                              void history.fetchNextPage();
                            }}
                          >
                            {history.isFetchingNextPage ? (
                              <PendingLabel>Đang tải tin nhắn trước…</PendingLabel>
                            ) : (
                              "Xem tin nhắn trước"
                            )}
                          </button>
                        )}
                        {history.isPending ? (
                          <LoadingState
                            compact
                            title="Đang tải tin nhắn…"
                            description="Chuẩn bị lịch sử trò chuyện của bạn."
                            shape="messages"
                          />
                        ) : messages.length ? (
                          messages.map((item, index) => (
                            <ChatMessageRow
                              key={item.id}
                              item={item}
                              own={item.sender_user_id === user.id}
                              showDate={
                                !index ||
                                day(messages[index - 1].created_at) !== day(item.created_at)
                              }
                              retryDisabled={paused}
                              retry={resend}
                            />
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
                                  onClick={() => {
                                    setDrafts((old) => ({
                                      ...old,
                                      [current.id]: consultationService
                                        ? `Chào ${recipient(current)}, tôi muốn được tư vấn về ${consultationService.name}.`
                                        : "Chào anh/chị, tôi muốn tìm hiểu thêm về dịch vụ chăm sóc.",
                                    }));
                                    inputRef.current?.focus();
                                  }}
                                >
                                  Soạn lời chào <ArrowRight size={15} />
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>
                      {showLatest && (
                        <button
                          type="button"
                          className="ktv-chat-latest"
                          onClick={() => {
                            nearBottom.current = true;
                            if (messagesRef.current)
                              messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
                            setShowLatest(false);
                          }}
                        >
                          <ArrowDown size={15} /> Về tin mới nhất
                        </button>
                      )}
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
                            (draft.trim() || attachment?.threadId === current.id) &&
                            !history.isPending &&
                            !history.isError
                          )
                            void submitMessage(current.id, draft.trim());
                        }}
                      >
                        {attachment?.threadId === current.id && (
                          <div className="ktv-chat-attachment-preview">
                            <Image
                              src={attachment.previewUrl}
                              alt="Ảnh chuẩn bị gửi"
                              width={80}
                              height={80}
                              unoptimized
                            />
                            <span>{attachment.file.name}</span>
                            <button
                              type="button"
                              aria-label="Xóa ảnh đính kèm"
                              onClick={() => setAttachment(null)}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        )}
                        {attachmentError && (
                          <p className="ktv-chat-attachment-error" role="alert">
                            {attachmentError}
                          </p>
                        )}
                        <input
                          ref={imageInputRef}
                          className="ktv-chat-file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="Tệp ảnh đính kèm"
                          disabled={paused}
                          onChange={(event) => {
                            chooseImage(event.currentTarget.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                        <button
                          type="button"
                          className="ktv-chat-attach-toggle"
                          aria-label="Chọn ảnh đính kèm"
                          title="Đính kèm ảnh JPG, PNG hoặc WebP (tối đa 5 MB)"
                          disabled={paused}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImagePlus size={22} />
                        </button>
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
                          enterKeyHint="send"
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
                              event.nativeEvent.keyCode !== 229 &&
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
                            (!draft.trim() && attachment?.threadId !== current.id) ||
                            history.isPending ||
                            history.isError
                          }
                          aria-label="Gửi tin nhắn"
                        >
                          <Send size={21} />
                        </button>
                        <small>
                          Ảnh JPG, PNG, WebP tối đa 5 MB. Không chia sẻ mật khẩu hoặc thông tin
                          thanh toán.
                        </small>
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
