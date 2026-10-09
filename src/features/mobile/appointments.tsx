"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatPrice } from "@/features/marketplace/format";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import "@/features/mobile/mobile.css";

interface Appointment {
  id: string;
  status: string;
  startsAt: string;
  requestExpiresAt: string;
  quote: {
    revision: number;
    totalVnd: string;
    snapshot: {
      serviceName?: string;
      providerName?: string;
      branchName?: string;
      variantName?: string;
    };
    reason: string;
    acceptedAt: string | null;
  };
}

const labels: Record<string, string> = {
  REQUESTED: "Chờ KTV nhận",
  ACCEPTED: "Chờ bạn xác nhận giá",
  CONFIRMED: "Đã xác nhận",
  EXPIRED: "Đã hết hạn",
  DECLINED: "KTV đã từ chối",
  CANCELLED: "Đã hủy",
  COMPLETED: "Đã hoàn tất",
};

function appointmentDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AppointmentsPage() {
  const { status, user, authFetch } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState("");

  const load = useCallback(async () => {
    if (!user || !user.permissions.includes("customer.portal")) return;
    setLoading(true);
    try {
      const rows = await authFetch<Appointment[]>("/bookings/me", { cache: "no-store" });
      setItems(rows);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được lịch hẹn của bạn.");
    } finally {
      setLoading(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    if (status === "authenticated")
      queueMicrotask(() => {
        void load();
      });
  }, [status, load]);

  const confirm = async (item: Appointment) => {
    if (
      !window.confirm(
        "Xác nhận đồng ý báo giá " + formatPrice(item.quote.totalVnd) + " cho lịch hẹn này?",
      )
    )
      return;
    setConfirmingId(item.id);
    setError("");
    try {
      await authFetch("/bookings/" + item.id + "/confirm-quote", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteRevision: item.quote.revision,
          expectedTotalVnd: item.quote.totalVnd,
          accepted: true,
        }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Báo giá có thể đã thay đổi. Vui lòng tải lại.",
      );
      await load();
    } finally {
      setConfirmingId("");
    }
  };

  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-booking-main">
        <div className="mm-booking-heading">
          <span className="mm-overline">TÀI KHOẢN CỦA BẠN</span>
          <h1>
            Lịch hẹn <em>của tôi.</em>
          </h1>
          <p>Theo dõi yêu cầu, phản hồi KTV và xác nhận báo giá trước khi lịch được chốt.</p>
        </div>
        {status === "loading" ? (
          <p role="status">Đang kiểm tra tài khoản...</p>
        ) : !user ? (
          <div className="mm-empty">
            <strong>Đăng nhập để xem lịch hẹn</strong>
            <Link className="mm-primary-cta" href="/dang-nhap?returnTo=%2Flich-hen">
              Đăng nhập <ArrowRight size={17} />
            </Link>
          </div>
        ) : !user.permissions.includes("customer.portal") ? (
          <div className="mm-empty">Tài khoản này chưa có quyền xem lịch hẹn của khách hàng.</div>
        ) : (
          <>
            <div className="mm-results-heading">
              <h3>Yêu cầu & lịch đã đặt</h3>
              <button
                onClick={() => void load()}
                className="mm-outline-cta"
                type="button"
                disabled={loading}
              >
                <RefreshCw size={15} /> Làm mới
              </button>
            </div>
            {error && (
              <p role="alert" className="mm-booking-error">
                {error}
              </p>
            )}
            {loading ? (
              <p role="status">Đang tải lịch hẹn...</p>
            ) : items.length === 0 ? (
              <div className="mm-empty">
                <CalendarDays size={32} />
                <strong>Bạn chưa có lịch hẹn nào</strong>
                <p>Chọn KTV hoặc dịch vụ, sau đó tìm ngày phù hợp.</p>
                <Link className="mm-primary-cta" href="/dat-lich">
                  Đặt lịch ngay <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              <div className="mm-appointments-list">
                {items.map((item) => (
                  <article className="mm-appointment" key={item.id}>
                    <div className="mm-appointment-head">
                      <strong>{item.quote.snapshot.serviceName || "Dịch vụ chăm sóc"}</strong>
                      <span className={"mm-status mm-status-" + item.status.toLowerCase()}>
                        {labels[item.status] || item.status}
                      </span>
                    </div>
                    <p>
                      <Clock3 size={16} /> {appointmentDate(item.startsAt)}
                    </p>
                    <p>
                      <ShieldCheck size={16} /> {item.quote.snapshot.providerName || "KTV"} ·{" "}
                      {item.quote.snapshot.branchName || "Cơ sở"}
                    </p>
                    <div className="mm-appointment-bottom">
                      <span>
                        Tổng báo giá <strong>{formatPrice(item.quote.totalVnd)}</strong>
                      </span>
                      {item.status === "ACCEPTED" && (
                        <button
                          type="button"
                          className="mm-primary-cta"
                          onClick={() => void confirm(item)}
                          disabled={!!confirmingId}
                        >
                          {confirmingId === item.id ? "Đang xác nhận..." : "Đồng ý báo giá"}{" "}
                          <CheckCircle2 size={17} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
