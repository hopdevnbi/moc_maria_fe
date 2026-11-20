"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Copy, Share2, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLocale } from "@/shared/i18n/locale-provider";
import type { MessageKey } from "@/shared/i18n/messages";
import "./referrals.css";

type Mine = {
  code: string;
  enabled: boolean;
  rewardCoins: number;
  registered: number;
  rewarded: number;
  coins: number;
  verificationAvailable: boolean;
  verificationStatus: string | null;
  hasPhone: boolean;
};
type Settings = {
  enabled: boolean;
  rewardCoins: number;
  payoutEnabled: boolean;
  verificationConfigured: boolean;
};
type Referral = {
  id: string;
  referrerName: string;
  referredName: string;
  status: string;
  rewardCoins: number;
  createdAt: string;
  riskScore: number;
  riskFlags: string[];
  reviewedAt: string | null;
};
const statuses: Record<string, MessageKey> = {
  PENDING_VERIFICATION: "ref.pending",
  VERIFIED: "ref.verified",
  REWARDED: "ref.rewarded",
  REVERSED: "ref.reversed",
  CONTACT_ALREADY_REWARDED: "ref.contactReused",
};
const flags: Record<string, MessageKey> = {
  VERIFIED_PHONE_PREVIOUSLY_USED: "ref.phoneSeen",
  SHARED_BROWSER: "ref.shared",
  HIGH_REFERRAL_VELOCITY: "ref.velocity",
  SHARED_NETWORK: "ref.ip",
};
export function ReferralCard() {
  const { user, authFetch } = useAuth();
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<MessageKey | null>(null),
    [busy, setBusy] = useState(false),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false);
  const key = ["referrals", "me", user?.id];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => authFetch<Mine>("/referrals/me", { signal, cache: "no-store" }),
    enabled: !!user?.isActive,
    retry: false,
    staleTime: 20000,
  });
  const m = query.data;
  const link = m ? "https://mocmaria.com/r/" + m.code : "";
  async function share(copy: boolean) {
    try {
      if (!copy && navigator.share) await navigator.share({ title: t("ref.title"), url: link });
      else {
        await navigator.clipboard.writeText(link);
        setNotice("ref.copied");
      }
    } catch {
      setNotice("ref.error");
    }
  }
  async function verify(confirm: boolean) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (confirm) {
        const r = await authFetch<{ rewarded: boolean; status: string }>(
          "/referrals/verify/confirm",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: otp }),
          },
        );
        setNotice(
          r.rewarded
            ? "ref.done"
            : r.status === "CONTACT_ALREADY_REWARDED"
              ? "ref.contactReused"
              : "ref.pending",
        );
        setOtp("");
        await qc.invalidateQueries({ queryKey: key });
      } else {
        await authFetch("/referrals/verify/start", { method: "POST" });
        setSent(true);
        setNotice("ref.sent");
      }
    } catch {
      setNotice("ref.error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mm-referral" lang={locale}>
      <header>
        <Gift size={25} />
        <div>
          <h2>{t("ref.title")}</h2>
          {m && <p>{t("ref.reward", { n: m.rewardCoins })}</p>}
        </div>
      </header>
      {query.isPending ? (
        <p role="status">{t("common.loading")}</p>
      ) : query.isError || !m ? (
        <p role="alert">
          {t("ref.error")}{" "}
          <button type="button" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </button>
        </p>
      ) : (
        <>
          <div className="mm-referral-stats">
            {(
              [
                [m.registered, "ref.registered"],
                [m.rewarded, "ref.rewarded"],
                [m.coins, "ref.coins"],
              ] as [number, MessageKey][]
            ).map(([n, k]) => (
              <div key={k}>
                <strong>{new Intl.NumberFormat(locale).format(n)}</strong>
                <small>{t(k)}</small>
              </div>
            ))}
          </div>
          <label>
            {t("ref.code")}
            <input value={m.code} readOnly />
          </label>
          <input aria-label={t("ref.copy")} value={link} readOnly />
          {!m.enabled ? (
            <p>{t("ref.inactive")}</p>
          ) : (
            <div className="mm-referral-actions">
              <button type="button" onClick={() => void share(true)}>
                <Copy size={17} />
                {t("ref.copy")}
              </button>
              <button type="button" onClick={() => void share(false)} aria-label={t("ref.title")}>
                <Share2 size={18} />
              </button>
            </div>
          )}
          {m.verificationStatus === "PENDING_VERIFICATION" && (
            <div className="mm-referral-verify">
              <strong>
                <ShieldCheck size={18} />
                {t("ref.verify")}
              </strong>
              {!m.hasPhone ? (
                <p>{t("ref.phoneRequired")}</p>
              ) : !m.verificationAvailable ? (
                <p>{t("ref.otpUnavailable")}</p>
              ) : (
                <>
                  <button disabled={busy} onClick={() => void verify(false)}>
                    {t("ref.sendOtp")}
                  </button>
                  {sent && (
                    <label>
                      {t("ref.otp")}
                      <input
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      />
                      <button
                        disabled={busy || !/^\d{4,10}$/.test(otp)}
                        onClick={() => void verify(true)}
                      >
                        {t("ref.confirm")}
                      </button>
                    </label>
                  )}
                </>
              )}
            </div>
          )}
          {m.verificationStatus && m.verificationStatus !== "PENDING_VERIFICATION" && (
            <p>{t(statuses[m.verificationStatus] ?? "ref.pending")}</p>
          )}
        </>
      )}
      {notice && <p role="status">{t(notice)}</p>}
    </section>
  );
}
export function ReferralShortcut() {
  const { t } = useLocale();
  return (
    <Link className="mm-referral-shortcut" href="/gioi-thieu">
      <Gift size={20} />
      {t("ref.title")}
    </Link>
  );
}
export function ReferralAdmin() {
  const { user } = useAuth();
  const { t } = useLocale();
  if (
    !user?.isActive ||
    !user.roles.includes("SUPER_ADMIN") ||
    !user.permissions.includes("admin.portal")
  )
    return <p role="alert">{t("monitor.denied")}</p>;
  return <AdminFeed key={user.id} />;
}
function AdminFeed() {
  const { user, authFetch } = useAuth();
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [page, setPage] = useState(1),
    [notice, setNotice] = useState<MessageKey | null>(null),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<Settings | null>(null);
  const settings = useQuery({
    queryKey: ["referrals", "settings", user?.id],
    queryFn: ({ signal }) =>
      authFetch<Settings>("/referrals/admin/settings", { signal, cache: "no-store" }),
    retry: false,
  });
  const rows = useQuery({
    queryKey: ["referrals", "admin", user?.id, page],
    queryFn: ({ signal }) =>
      authFetch<{ items: Referral[]; hasMore: boolean }>("/referrals/admin?page=" + page, {
        signal,
        cache: "no-store",
      }),
    retry: false,
  });
  const config = edit ?? settings.data;
  async function save() {
    if (!config || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await authFetch("/referrals/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          rewardCoins: config.rewardCoins,
          payoutEnabled: config.payoutEnabled,
        }),
      });
      setEdit(null);
      await qc.invalidateQueries({ queryKey: ["referrals"] });
      setNotice("ref.saved");
    } catch {
      setNotice("ref.error");
    } finally {
      setBusy(false);
    }
  }
  async function review(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await authFetch("/referrals/admin/" + encodeURIComponent(id) + "/review", { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["referrals", "admin"] });
      setNotice("ref.reviewed");
    } catch {
      setNotice("ref.error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mm-referral mm-referral-admin" lang={locale}>
      <header>
        <ShieldCheck size={25} />
        <div>
          <h1>{t("ref.admin")}</h1>
          <p>{t("ref.hint")}</p>
        </div>
      </header>
      {config && (
        <div className="mm-referral-settings">
          <h2>{t("ref.settings")}</h2>
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setEdit({ ...config, enabled: e.target.checked })}
            />
            {t("ref.accept")}
          </label>
          <label>
            {t("ref.amount")}
            <input
              type="number"
              min={1}
              max={100000}
              value={config.rewardCoins}
              onChange={(e) => setEdit({ ...config, rewardCoins: Number(e.target.value) })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.payoutEnabled}
              disabled={!config.verificationConfigured}
              onChange={(e) => setEdit({ ...config, payoutEnabled: e.target.checked })}
            />
            {t("ref.verify")}
          </label>
          {!config.verificationConfigured && <p>{t("ref.otpUnavailable")}</p>}
          <button
            disabled={
              !edit ||
              busy ||
              !Number.isInteger(config.rewardCoins) ||
              config.rewardCoins < 1 ||
              config.rewardCoins > 100000
            }
            onClick={() => void save()}
          >
            {t("common.save")}
          </button>
        </div>
      )}
      {settings.isError || rows.isError ? (
        <p role="alert">
          {t("ref.error")}{" "}
          <button
            onClick={() => {
              void settings.refetch();
              void rows.refetch();
            }}
          >
            {t("common.retry")}
          </button>
        </p>
      ) : rows.isPending ? (
        <p role="status">{t("common.loading")}</p>
      ) : !rows.data?.items.length ? (
        <p>{t("ref.none")}</p>
      ) : (
        <div className="mm-referral-list">
          {rows.data.items.map((r) => (
            <article key={r.id}>
              <strong>
                {r.referrerName} → {r.referredName}
              </strong>
              <small>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Asia/Ho_Chi_Minh",
                }).format(new Date(r.createdAt))}{" "}
                · {r.rewardCoins} Coin · {t(statuses[r.status] ?? "ref.pending")}
              </small>
              <p>
                {t("ref.risk")}: <b>{r.riskScore}/100</b>
              </p>
              <div>
                {r.riskFlags.length ? (
                  r.riskFlags.map((f) => (
                    <span key={f} className="mm-referral-risk">
                      {flags[f] ? t(flags[f]) : f}
                    </span>
                  ))
                ) : (
                  <small>{t("ref.noSignals")}</small>
                )}
              </div>
              {r.reviewedAt ? (
                <small>{t("ref.reviewed")}</small>
              ) : (
                <button disabled={busy} onClick={() => void review(r.id)}>
                  {t("ref.review")}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="mm-referral-actions">
        <button disabled={page <= 1 || rows.isFetching} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft size={16} />
          {t("ref.prev")}
        </button>
        <button
          disabled={!rows.data?.hasMore || rows.isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          {t("ref.next")}
          <ChevronRight size={16} />
        </button>
      </div>
      {notice && <p role="status">{t(notice)}</p>}
    </section>
  );
}
