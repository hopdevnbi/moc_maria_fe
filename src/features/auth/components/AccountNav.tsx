"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Crown, LogOut, UserRound } from "lucide-react";
import { useLocale } from "@/shared/i18n/locale-provider";
import { useAuth } from "../hooks/useAuth";
import { isActiveVip, useCustomerSelfProfile } from "@/features/mobile/customer-account-profile";
import { vipLabel } from "@/features/membership/vip-level";

export function AccountNav() {
  const { t } = useLocale();
  const { status, user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const customer = useCustomerSelfProfile();
  const vip = isActiveVip(customer.data);
  const avatar = customer.data?.customer.avatarUrl;

  if (status === "loading") {
    return <div className="h-10 w-32 animate-pulse rounded-full bg-white/60" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dang-nhap"
          className="rounded-full border border-[var(--moc-border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--moc-green)]"
        >
          {t("auth.login")}
        </Link>
        <Link
          href="/dang-ky"
          className="rounded-full bg-[var(--moc-green)] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("auth.register")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/tai-khoan"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--moc-border)] bg-white/85 px-4 py-2 text-sm font-semibold text-[var(--moc-green-deep)]"
      >
        {avatar?.startsWith("https://") ? (
          <Image
            unoptimized
            src={avatar}
            width={24}
            height={24}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <UserRound size={16} />
        )}
        {user.displayName}
        {vip && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[#fff0c9] px-2 py-0.5 text-[10px] font-extrabold text-[#9b712b]"
            title={t("auth.vipActive", { level: vipLabel(customer.data?.membership.level) })}
          >
            <Crown size={12} fill="currentColor" />
            {vipLabel(customer.data?.membership.level)}
          </span>
        )}
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await logout();
          } catch {
            setError("logout");
          } finally {
            setBusy(false);
          }
        }}
        data-moc-logout
        aria-label={t("auth.logout")}
        className="rounded-full border border-[var(--moc-border)] bg-white/85 p-2.5 text-[var(--moc-muted)]"
      >
        <LogOut size={16} />
        <span>{busy ? t("auth.loggingOut") : t("auth.logout")}</span>
      </button>
      {error && <span role="alert">{t("auth.logoutError")}</span>}
    </div>
  );
}
