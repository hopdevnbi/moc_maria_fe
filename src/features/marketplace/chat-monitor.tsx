"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowDown,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLocale } from "@/shared/i18n/locale-provider";
import { ApiError } from "@/features/auth/auth-api";
import "./chat-monitor.css";
type Item = {
  id: string;
  seq: string;
  threadId: string;
  customerName: string;
  providerName: string;
  senderName: string;
  senderRole: "customer" | "provider" | "support";
  body: string | null;
  imageUrl: string | null;
  protected: boolean;
  createdAt: string;
};
type Page = { items: Item[]; nextBefore: string | null };
const MAX_PAGES = 2;
export function canViewChatMonitor(
  user: { roles?: readonly string[]; permissions?: readonly string[] } | null | undefined,
) {
  return !!(
    user?.roles?.includes("SUPER_ADMIN") &&
    user.permissions?.includes("admin.portal") &&
    user.permissions.includes("customers.manage")
  );
}
export function ChatMonitor({
  embedded = false,
  onBack,
}: { embedded?: boolean; onBack?: () => void } = {}) {
  const { user } = useAuth();
  const { t } = useLocale();
  if (!canViewChatMonitor(user)) return <p role="alert">{t("monitor.denied")}</p>;
  return <MonitorFeed key={user?.id} embedded={embedded} onBack={onBack} />;
}
function MonitorFeed({ embedded, onBack }: { embedded: boolean; onBack?: () => void }) {
  const { authFetch } = useAuth();
  const { t, locale } = useLocale();
  const [thread, setThread] = useState<string | null>(null),
    [before, setBefore] = useState<string | null>(null),
    [pageCount, setPageCount] = useState(1),
    [loadingMore, setLoadingMore] = useState(false),
    [role, setRole] = useState<Item["senderRole"] | "all">("all"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(false),
    [refresh, setRefresh] = useState(0),
    [newIds, setNewIds] = useState<Set<string>>(new Set());
  const last = useRef<Set<string> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function load() {
      try {
        const path =
          "/admin/chat-monitor" + (thread ? "/threads/" + encodeURIComponent(thread) : "");
        // Revalidate only the bounded, currently displayed cursor window.
        const items: Item[] = [];
        const ids = new Set<string>();
        let cursor = before;
        for (let n = 0; n < pageCount; n++) {
          const data = await authFetch<Page>(
            path + (cursor ? "?before=" + encodeURIComponent(cursor) : ""),
            { cache: "no-store", signal: controller.signal },
          );
          if (disposed) return;
          for (const item of data.items)
            if (!ids.has(item.id)) {
              ids.add(item.id);
              items.push(item);
            }
          cursor = data.nextBefore;
          if (!cursor) break;
        }
        const previous = last.current;
        setNewIds(
          new Set(
            !before && previous ? items.filter((x) => !previous.has(x.id)).map((x) => x.id) : [],
          ),
        );
        last.current = ids;
        setPage({ items, nextBefore: cursor });
        setError(false);
        setLoadingMore(false);
      } catch (e) {
        if (!disposed) {
          setPage(null);
          setError(true);
          setLoadingMore(false);
          last.current = null;
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return;
        }
      }
      if (!disposed) timer = setTimeout(load, 4000);
    }
    void load();
    return () => {
      disposed = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [authFetch, thread, before, pageCount, refresh]);
  function navigate(nextThread: string | null, nextBefore: string | null) {
    setPage(null);
    last.current = null;
    setPageCount(1);
    setLoadingMore(false);
    setError(false);
    if (nextThread !== thread) {
      setRole("all");
      setSearch("");
    }
    setNewIds(new Set());
    setThread(nextThread);
    setBefore(nextBefore);
    if (listRef.current) listRef.current.scrollTop = 0;
  }
  function more() {
    if (!page?.nextBefore || loadingMore) return;
    if (pageCount >= MAX_PAGES) {
      navigate(thread, page.nextBefore);
      return;
    }
    // Anchor the history window rather than allowing new messages to shift older pages.
    if (!before && page.items.length) setBefore((BigInt(page.items[0].seq) + BigInt(1)).toString());
    setLoadingMore(true);
    setNewIds(new Set());
    setPageCount((v) => Math.min(MAX_PAGES, v + 1));
  }
  const needle = search.toLocaleLowerCase().trim();
  const items =
    page?.items.filter(
      (x) =>
        (role === "all" || role === x.senderRole) &&
        [x.customerName, x.providerName, x.senderName, x.body ?? ""].some((v) =>
          v.toLocaleLowerCase().includes(needle),
        ),
    ) ?? [];
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return (
    <section className={"mm-monitor" + (embedded ? " mm-monitor-embedded" : "")} lang={locale}>
      <header className="mm-monitor-header">
        {onBack && (
          <button
            type="button"
            className="mm-monitor-back"
            aria-label={t("monitor.back")}
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <span className="mm-monitor-header-icon">
          <ShieldCheck size={22} />
        </span>
        <div className="mm-monitor-heading">
          <h1>
            {thread && page?.items[0]
              ? page.items[0].providerName + " · " + page.items[0].customerName
              : t("monitor.title")}
          </h1>
          <p>{t("monitor.onlyAdmin")}</p>
        </div>
        <span className="mm-monitor-live">
          <i className={before || error ? "paused" : ""} />
          {error ? t("monitor.errorShort") : before ? t("monitor.paused") : t("monitor.live")}
        </span>
        <button
          type="button"
          className="mm-monitor-refresh"
          onClick={() => setRefresh((v) => v + 1)}
          title={t("monitor.refresh")}
          aria-label={t("monitor.refresh")}
        >
          <RefreshCw size={18} />
        </button>
      </header>
      <div className="mm-monitor-tools">
        {thread && (
          <button onClick={() => navigate(null, null)}>
            <ArrowLeft size={16} />
            {t("monitor.all")}
          </button>
        )}
        {before && <button onClick={() => navigate(thread, null)}>{t("monitor.latest")}</button>}
        <label className="mm-monitor-search">
          <Search size={17} />
          <input
            aria-label={t("monitor.search")}
            placeholder={t("monitor.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
          />
        </label>
        <div className="mm-monitor-role" aria-label={t("monitor.filter")}>
          {(["all", "customer", "provider", "support"] as const).map((r) => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
              {t(
                r === "all"
                  ? "monitor.allRoles"
                  : r === "customer"
                    ? "monitor.customer"
                    : r === "provider"
                      ? "monitor.provider"
                      : "monitor.admin",
              )}
            </button>
          ))}
        </div>
        <div className="mm-monitor-count">
          {t("monitor.loaded", { count: page?.items.length ?? 0 })}
        </div>
      </div>
      <div className="mm-monitor-scroll" ref={listRef}>
        {error ? (
          <p role="alert">{t("monitor.error")}</p>
        ) : !page ? (
          <p role="status">{t("common.loading")}</p>
        ) : !items.length ? (
          <p role="status">{t("monitor.empty")}</p>
        ) : (
          <div className="mm-monitor-list">
            {items.map((item) => (
              <article
                key={item.id}
                className={`mm-monitor-message mm-monitor-${item.senderRole}${newIds.has(item.id) ? " mm-monitor-unseen" : ""}`}
              >
                <span className="mm-monitor-avatar" aria-hidden="true">
                  {item.senderRole === "support" ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <UsersRound size={18} />
                  )}
                </span>
                <div className="mm-monitor-content">
                  <div className="mm-monitor-pair">
                    <strong>
                      {item.providerName} ↔ {item.customerName}
                    </strong>
                    <time dateTime={item.createdAt}>{date.format(new Date(item.createdAt))}</time>
                  </div>
                  <div className="mm-monitor-sender">
                    <MessageCircle size={15} />
                    <strong>{item.senderName}</strong>
                    <span>
                      {t(
                        item.senderRole === "customer"
                          ? "monitor.customer"
                          : item.senderRole === "provider"
                            ? "monitor.provider"
                            : "monitor.admin",
                      )}
                    </span>
                    {newIds.has(item.id) && (
                      <span className="mm-monitor-new">{t("monitor.new")}</span>
                    )}
                  </div>
                  {item.protected ? (
                    <p className="mm-monitor-protected">
                      <LockKeyhole size={16} />
                      {t("monitor.protected")}
                    </p>
                  ) : (
                    <>
                      <p className="mm-monitor-body">{item.body}</p>
                      {item.imageUrl &&
                        /^https:\/\/[a-z0-9.-]+\/moc-maria\/chat-attachments\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(
                          item.imageUrl,
                        ) && (
                          <Image
                            className="mm-monitor-image"
                            src={item.imageUrl}
                            alt={t("monitor.image")}
                            width={180}
                            height={120}
                            unoptimized
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        )}
                    </>
                  )}
                  <div className="mm-monitor-actions">
                    {!thread && (
                      <button onClick={() => navigate(item.threadId, null)}>
                        {t("monitor.history")}
                      </button>
                    )}
                    {!item.protected && (
                      <Link
                        href={
                          "/tin-nhan?thread=" + encodeURIComponent(item.threadId) + "&support=1"
                        }
                      >
                        {t("monitor.support")}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {page?.nextBefore && (
          <div className="mm-monitor-footer">
            <button className="mm-monitor-next" disabled={loadingMore} onClick={more}>
              <ArrowDown size={16} />
              {loadingMore
                ? t("common.loading")
                : pageCount >= MAX_PAGES
                  ? t("monitor.nextWindow")
                  : t("monitor.loadMore")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
