"use client";

import { ArrowUpRight, Gift, Snowflake } from "lucide-react";
import Image from "next/image";
import { useLocale } from "@/shared/i18n/locale-provider";

export function ChristmasWelcome() {
  const { locale, t } = useLocale();
  return (
    <aside className="christmas-welcome" aria-label={t("promo.christmas")} lang={locale}>
      <Image src="/christmas/santa-face.svg" width={22} height={24} alt="" />
      <Snowflake size={13} aria-hidden="true" />
      <span>{t("promo.welcome")}</span>
      <a href="https://event.mocmaria.com/">
        <Gift size={14} aria-hidden="true" /> {t("promo.gifts")}{" "}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </aside>
  );
}
