"use client";
import { ShieldCheck } from "lucide-react";
import { useLocale } from "@/shared/i18n/locale-provider";

export function BookingReassurance() {
  const { t } = useLocale();
  return (
    <aside className="mm-booking-reassurance" aria-label={t("booking.safetyTitle")}>
      <ShieldCheck size={22} aria-hidden="true" />
      <div>
        <strong>{t("booking.safetyTitle")}</strong>
        <p>{t("booking.safetyBody")}</p>
      </div>
    </aside>
  );
}
