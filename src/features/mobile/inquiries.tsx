"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
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
}
const labels: Record<string, string> = {
  PENDING: "Chờ KTV phản hồi",
  CONTACTED: "KTV đang trao đổi với bạn",
  DECLINED: "KTV chưa thể nhận yêu cầu",
  CANCELLED: "Đã hủy yêu cầu",
};
export function AppointmentInquiries() {
  const { user, authFetch } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await authFetch<Inquiry[]>("/appointment-inquiries", { cache: "no-store" }));
      setNotice("");
    } catch {
      setNotice("Chưa tải được yêu cầu đặt lịch. Vui lòng tải lại.");
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
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa cập nhật được yêu cầu.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="mm-account-profile mm-inquiries" id="yeu-cau-dat-lich">
      <div className="mm-inquiry-heading">
        <h2>Yêu cầu đặt lịch</h2>
        <button className="mm-outline-cta" disabled={loading} onClick={() => void load()}>
          Tải lại
        </button>
      </div>
      {notice && <p role="alert">{notice}</p>}
      {loading ? (
        <p role="status">Đang tải yêu cầu...</p>
      ) : !items.length ? (
        <p>Bạn chưa có yêu cầu đặt lịch nào.</p>
      ) : (
        items.map((item) => (
          <article key={item.id} className="mm-inquiry-card">
            <strong>
              {item.serviceName} ·{" "}
              {user?.id === item.customerId ? item.providerName : item.customerName}
            </strong>
            <p className="mm-account-role">{labels[item.status] || item.status}</p>
            <p>
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Ho_Chi_Minh",
              }).format(new Date(item.requestedAt))}{" "}
              · Thời gian mong muốn
            </p>
            <p>
              {item.location === "AT_HOME" ? "Tại địa chỉ khách hàng" : "Tại Mộc Maria"} ·{" "}
              {item.address}
            </p>
            {item.notes && <p className="mm-preserve-lines">Ghi chú: {item.notes}</p>}
            <div className="mm-inquiry-actions">
              {user?.id !== item.customerId &&
                user?.roles.some((r) => r === "THERAPIST" || r === "DOCTOR_CONSULTANT") &&
                item.location === "AT_HOME" &&
                item.status === "CONTACTED" && (
                  <Link className="mm-primary-cta" href="/ktv/an-toan">
                    An toàn khi đi phục vụ
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
                Mở chat
              </Link>
              {user?.id === item.customerId
                ? (item.status === "PENDING" || item.status === "CONTACTED") && (
                    <button
                      disabled={!!busy}
                      className="mm-outline-cta"
                      onClick={() => void reply(item.id, "CANCELLED")}
                    >
                      Hủy yêu cầu
                    </button>
                  )
                : item.status === "PENDING" && (
                    <>
                      <button
                        disabled={!!busy}
                        className="mm-primary-cta"
                        onClick={() => void reply(item.id, "CONTACTED")}
                      >
                        Nhận trao đổi
                      </button>
                      <button
                        disabled={!!busy}
                        className="mm-outline-cta"
                        onClick={() => void reply(item.id, "DECLINED")}
                      >
                        Chưa thể phục vụ
                      </button>
                    </>
                  )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
