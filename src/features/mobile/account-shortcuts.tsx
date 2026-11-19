"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/locale-provider";
import {
  ArrowRight,
  CalendarDays,
  Gamepad2,
  KeyRound,
  LogOut,
  MessageCircle,
  UserRound,
  Users,
} from "lucide-react";
import { PwaInstallShortcut } from "@/shared/pwa/pwa-install-shortcut";

type AccountShortcutsProps = {
  technician: boolean;
  signingOut: boolean;
  onSignOut: () => void | Promise<void>;
};

export function AccountShortcuts({ technician, signingOut, onSignOut }: AccountShortcutsProps) {
  const { t, locale } = useLocale();
  return (
    <div className="mm-account-shortcut-stack" lang={locale}>
      <section className="mm-account-journey" aria-label={t("cp.quick")}>
        <div className="mm-account-shortcut-heading">
          <span className="mm-overline">{t("cp.quickTitle")}</span>
          <h2>{technician ? t("cp.startWork") : t("cp.start")}</h2>
        </div>
        <div className="mm-account-journey-links">
          <Link
            className="mm-account-journey-primary"
            href={technician ? "/tin-nhan" : "/dat-lich"}
          >
            {technician ? <MessageCircle size={20} /> : <CalendarDays size={20} />}
            <span>{technician ? t("cp.reply") : t("cp.book")}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link
            className="mm-account-journey-secondary"
            href={technician ? "#lich-lam-viec" : "/chuyen-vien"}
          >
            {technician ? <CalendarDays size={20} /> : <Users size={20} />}
            <span>{technician ? t("cp.schedule") : t("cp.chooseChat")}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section
        className="mm-account-security-shortcuts"
        aria-labelledby="mm-account-security-heading"
      >
        <div className="mm-account-shortcut-heading">
          <span className="mm-overline">{t("cp.settings")}</span>
          <h2 id="mm-account-security-heading">{t("cp.security")}</h2>
        </div>
        <div className="mm-account-security-links">
          <Link href="/lich-hen">
            <CalendarDays size={18} aria-hidden="true" />
            <span>{t("cp.requests")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="#thong-tin-tai-khoan">
            <UserRound size={20} aria-hidden="true" />
            <span>{t("cp.myInfo")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="#doi-mat-khau">
            <KeyRound size={20} aria-hidden="true" />
            <span>{t("cp.password")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/tro-choi/tai-khoan">
            <Gamepad2 size={20} aria-hidden="true" />
            <span>{t("cp.wheel")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <PwaInstallShortcut />
        </div>
        <div className="mm-account-security-footer">
          <button type="button" disabled={signingOut} onClick={onSignOut}>
            <LogOut size={18} aria-hidden="true" />
            {signingOut ? t("account.signingOut") : t("account.logout")}
          </button>
        </div>
      </section>
    </div>
  );
}
