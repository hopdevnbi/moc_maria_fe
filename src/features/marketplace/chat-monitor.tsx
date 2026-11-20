"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LockKeyhole, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
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
export function ChatMonitor() {
  const { user } = useAuth();
  const { t } = useLocale();
  if (
    !user?.roles.includes("SUPER_ADMIN") ||
    !user.permissions.includes("admin.portal") ||
    !user.permissions.includes("customers.manage")
  )
    return <p role="alert">{t("monitor.denied")}</p>;
  return <MonitorFeed key={user.id} />;
}
function MonitorFeed() {
  const { authFetch } = useAuth();
  const { t, locale } = useLocale();
  const [thread, setThread] = useState<string | null>(null),
    [before, setBefore] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(false),
    [refresh, setRefresh] = useState(0),
    [newIds, setNewIds] = useState<Set<string>>(new Set());
  const last = useRef<Set<string> | null>(null);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    last.current = null;
    async function load() {
      try {
        const path =
          "/admin/chat-monitor" +
          (thread ? "/threads/" + encodeURIComponent(thread) : "") +
          (before ? "?before=" + encodeURIComponent(before) : "");
        const data = await authFetch<Page>(path, { cache: "no-store", signal: controller.signal });
        if (disposed) return;
        const previous = last.current;
        const ids = new Set(data.items.map((x) => x.id));
        setNewIds(
          new Set(previous ? data.items.filter((x) => !previous.has(x.id)).map((x) => x.id) : []),
        );
        last.current = ids;
        setPage(data);
        setError(false);
      } catch (e) {
        if (!disposed) {
          setPage(null);
          setError(true);
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
  }, [authFetch, thread, before, refresh]);
  function navigate(nextThread: string | null, nextBefore: string | null) {
    setPage(null);
    setNewIds(new Set());
    setThread(nextThread);
    setBefore(nextBefore);
  }
  const needle = search.toLocaleLowerCase().trim();
  const items =
    page?.items.filter((x) =>
      [x.customerName, x.providerName, x.senderName, x.body ?? ""].some((v) =>
        v.toLocaleLowerCase().includes(needle),
      ),
    ) ?? [];
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return (
    <section className="mm-monitor" lang={locale}>
      <header className="mm-monitor-header">
        <div>
          <ShieldCheck size={23} />
          <h1>{t("monitor.title")}</h1>
          <p>{t("monitor.subtitle")}</p>
        </div>
        <span className="mm-monitor-live">{before ? t("monitor.paused") : t("monitor.live")}</span>
      </header>
      <div className="mm-monitor-tools">
        {thread && (
          <button onClick={() => navigate(null, null)}>
            <ArrowLeft size={16} />
            {t("monitor.all")}
          </button>
        )}
        {before && <button onClick={() => navigate(thread, null)}>{t("monitor.latest")}</button>}
        <input
          aria-label={t("monitor.search")}
          placeholder={t("monitor.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => {
            setRefresh((v) => v + 1);
          }}
        >
          <RefreshCw size={16} />
          {t("monitor.refresh")}
        </button>
      </div>
      {error ? (
        <p role="alert">{t("monitor.error")}</p>
      ) : !page ? (
        <p role="status">{t("common.loading")}</p>
      ) : !items.length ? (
        <p role="status">{t("monitor.empty")}</p>
      ) : (
        <div className="mm-monitor-list">
          {items.map((item) => (
            <article key={item.id} className={`mm-monitor-message mm-monitor-${item.senderRole}`}>
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
                {newIds.has(item.id) && <span className="mm-monitor-new">{t("monitor.new")}</span>}
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
                        width={280}
                        height={210}
                        unoptimized
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
                    href={"/tin-nhan?thread=" + encodeURIComponent(item.threadId) + "&support=1"}
                  >
                    {t("monitor.support")}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {page?.nextBefore && (
        <button className="mm-monitor-next" onClick={() => navigate(thread, page.nextBefore)}>
          {t("monitor.older")}
        </button>
      )}
    </section>
  );
}
