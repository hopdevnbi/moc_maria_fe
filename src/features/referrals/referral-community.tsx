"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLocale } from "@/shared/i18n/locale-provider";
import "./referrals.css";

export function safeCommunityUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return /^https:\/\/zalo\.me\/g\/[A-Za-z0-9_-]{1,160}\/?$/.test(value)
    ? value.replace(/\/$/, "")
    : null;
}
function useCommunity() {
  const { user, authFetch } = useAuth();
  return useQuery({
    queryKey: ["referrals", "community", user?.id],
    queryFn: ({ signal }) =>
      authFetch<{ url: string | null }>("/referrals/community", { signal, cache: "no-store" }),
    enabled: !!user?.isActive,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
export function ReferralCommunity({ onDismiss }: { onDismiss?: () => void }) {
  const { t, locale } = useLocale();
  const query = useCommunity();
  const url = safeCommunityUrl(query.data?.url);
  if (!url || query.isError) return null;
  return (
    <section
      className={
        onDismiss ? "mm-referral-community mm-referral-community-welcome" : "mm-referral-community"
      }
      lang={locale}
      aria-label={t("ref.community")}
    >
      <div className="mm-referral-community-heading">
        <MessageCircle size={22} aria-hidden="true" />
        <strong>{t("ref.community")}</strong>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        )}
      </div>
      <p>{t("ref.communityHint")}</p>
      <div className="mm-referral-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={onDismiss}>
          {t("ref.joinZalo")}
        </a>
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            {t("ref.communityLater")}
          </button>
        )}
      </div>
    </section>
  );
}
export function CommunitySettings() {
  const { user, authFetch } = useAuth();
  const { t } = useLocale();
  const qc = useQueryClient();
  const query = useCommunity();
  const [edit, setEdit] = useState<string | null>(null),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState<"ref.saved" | "ref.error" | null>(null);
  const value = edit ?? query.data?.url ?? "";
  const valid = !value.trim() || !!safeCommunityUrl(value);
  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      await authFetch("/referrals/admin/community", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value.trim() }),
      });
      await qc.invalidateQueries({ queryKey: ["referrals", "community", user?.id] });
      setEdit(null);
      setNotice("ref.saved");
    } catch {
      setNotice("ref.error");
    } finally {
      setSaving(false);
    }
  }
  if (query.isPending) return <p role="status">{t("common.loading")}</p>;
  if (query.isError)
    return (
      <p role="alert">
        {t("ref.error")}{" "}
        <button type="button" onClick={() => void query.refetch()}>
          {t("common.retry")}
        </button>
      </p>
    );
  return (
    <div className="mm-referral-settings">
      <h2>{t("ref.communitySettings")}</h2>
      <p>{t(query.data?.url ? "ref.communityReady" : "ref.communityOff")}</p>
      <label>
        {t("ref.communityLink")}
        <input
          value={value}
          maxLength={256}
          type="url"
          placeholder="https://zalo.me/g/..."
          onChange={(e) => {
            setEdit(e.target.value);
            setNotice(null);
          }}
        />
      </label>
      <p>{t("ref.communityHelp")}</p>
      {!valid && <p role="alert">{t("ref.communityInvalid")}</p>}
      <button
        type="button"
        disabled={saving || !valid || value === (query.data?.url ?? "")}
        onClick={() => void save()}
      >
        {t("common.save")}
      </button>
      {notice && <p role={notice === "ref.error" ? "alert" : "status"}>{t(notice)}</p>}
    </div>
  );
}
