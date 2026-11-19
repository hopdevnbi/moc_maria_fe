"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingState, RefreshNotice } from "@/shared/loading/loading-state";
import { inquiryDisplayStatus } from "@/shared/booking/inquiry-status";
import { useLocale } from "@/shared/i18n/locale-provider";
import type { CustomerActivityKey } from "@/shared/i18n/customer-activity-messages";
import { menuName } from "@/shared/i18n/menu-names";
export interface Inquiry {
  id: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceName: string;
  location: string;
  address: string;
  requestedAt: string;
  notes: string;
  status: string;
  serviceId?: string;
  providerCompletedAt?: string;
  declineReason?: string;
  appointmentId?: string;
  fulfillmentStatus?: string;
  archivedAt?: string;
}
const labels: Record<string, CustomerActivityKey> = {
  PENDING: "iq.pending",
  CONTACTED: "iq.contacted",
  DECLINED: "iq.declined",
  CANCELLED: "iq.cancelled",
  CONFIRMED: "iq.confirmed",
  IN_SERVICE: "iq.inService",
  COMPLETED: "iq.completed",
};
export function AppointmentInquiries({ onlySent = false }: { onlySent?: boolean }) {
  const { t, locale } = useLocale();
  const { user, authFetch } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [notice, setNotice] = useState<CustomerActivityKey | "">("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const visibleItems = onlySent ? items.filter((item) => item.customerId === user?.id) : items;
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await authFetch<Inquiry[]>("/appointment-inquiries", { cache: "no-store" }));
      setNotice("");
    } catch {
      setNotice("iq.loadError");
    } finally {
      setLoading(false);
    }
  }, [user, authFetch]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  async function reply(id: string, status: string) {
    if (busy) return;
    setBusy(id);
    try {
      await authFetch("/appointment-inquiries/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch {
      setNotice("iq.updateError");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="mm-account-profile mm-inquiries" id="yeu-cau-dat-lich" lang={locale}>
      <div className="mm-inquiry-heading">
        <h2>{onlySent ? t("iq.sent") : t("iq.title")}</h2>
        <button className="mm-outline-cta" disabled={loading} onClick={() => void load()}>
          {t("iq.reload")}
        </button>
      </div>
      {notice && <p role="alert">{t(notice)}</p>}
      {loading && visibleItems.length > 0 && <RefreshNotice labelKey="loading.refreshRequests" />}
      {loading && visibleItems.length === 0 ? (
        <LoadingState compact titleKey="loading.requests" description="" shape="list" />
      ) : !visibleItems.length ? (
        <p>{t("iq.empty")}</p>
      ) : (
        visibleItems.map((item) => (
          <article key={item.id} className="mm-inquiry-card">
            <strong>
              {menuName(locale, item.serviceName)} ·{" "}
              {user?.id === item.customerId ? item.providerName : item.customerName}
            </strong>
            <p className="mm-account-role">
              {labels[inquiryDisplayStatus(item)]
                ? t(labels[inquiryDisplayStatus(item)])
                : item.status}
            </p>
            <p>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Ho_Chi_Minh",
              }).format(new Date(item.requestedAt))}{" "}
              · {t("iq.time")}
            </p>
            <p>
              {item.location === "AT_HOME" ? t("iq.home") : t("booking.atBranch")} · {item.address}
            </p>
            {item.notes && (
              <p className="mm-preserve-lines">{t("iq.notes", { text: item.notes })}</p>
            )}
            {item.status === "DECLINED" && item.declineReason && (
              <p className="mm-preserve-lines">{t("iq.reason", { text: item.declineReason })}</p>
            )}
            <div className="mm-inquiry-actions">
              {user?.id !== item.customerId &&
                user?.roles.some((r) => r === "THERAPIST" || r === "DOCTOR_CONSULTANT") &&
                item.location === "AT_HOME" &&
                item.status === "CONTACTED" && (
                  <Link className="mm-primary-cta" href="/ktv/an-toan">
                    {t("iq.safety")}
                  </Link>
                )}
              <Link
                className="mm-outline-cta"
                href={
                  user?.id === item.customerId
                    ? "/tin-nhan?provider=" + item.providerId
                    : "/tin-nhan"
                }
              >
                {t("iq.chat")}
              </Link>
              {user?.id === item.customerId
                ? !item.providerCompletedAt &&
                  !item.appointmentId &&
                  (item.status === "PENDING" || item.status === "CONTACTED") && (
                    <button
                      disabled={!!busy || loading}
                      className="mm-outline-cta"
                      onClick={() => void reply(item.id, "CANCELLED")}
                    >
                      {t("iq.cancel")}
                    </button>
                  )
                : item.status === "PENDING" && (
                    <>
                      <button
                        disabled={!!busy || loading}
                        className="mm-primary-cta"
                        onClick={() => void reply(item.id, "CONTACTED")}
                      >
                        {t("iq.accept")}
                      </button>
                      <Link className="mm-outline-cta" href="/tai-khoan">
                        {t("iq.decline")}
                      </Link>
                    </>
                  )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
