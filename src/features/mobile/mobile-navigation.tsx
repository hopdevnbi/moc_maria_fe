"use client";
import Link from "next/link";
import { useLocale } from "@/shared/i18n/locale-provider";
import { CalendarDays, HandHeart, Home, MessageCircle, UserRound } from "lucide-react";
import "./mobile-navigation.css";

export function MobileNavigation({
  active = "home",
  mainSite = false,
}: {
  active?: "home" | "providers" | "services" | "booking" | "chat" | "account" | null;
  mainSite?: boolean;
}) {
  const { locale, t } = useLocale();
  const current = active === "providers" ? "home" : active;
  const nav = [
    { href: "/", label: t("nav.home"), icon: Home, key: "home" },
    { href: "/dich-vu", label: t("nav.services"), icon: HandHeart, key: "services" },
    { href: "/dat-lich", label: t("nav.booking"), icon: CalendarDays, key: "booking" },
    { href: "/tin-nhan", label: t("nav.chat"), icon: MessageCircle, key: "chat" },
    { href: "/tai-khoan", label: t("nav.account"), icon: UserRound, key: "account" },
  ] as const;
  return (
    <nav className="mobile-tabbar" lang={locale} aria-label={t("nav.quick")}>
      {nav.map(({ href, label, icon: Icon, key }) => (
        <Link
          key={key}
          href={mainSite ? "https://mocmaria.com" + href : href}
          aria-current={current === key ? "page" : undefined}
          className={"mobile-tab" + (current === key ? " is-current" : "")}
        >
          <span className="mobile-tab-icon">
            <Icon size={21} strokeWidth={current === key ? 2.3 : 1.8} />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
