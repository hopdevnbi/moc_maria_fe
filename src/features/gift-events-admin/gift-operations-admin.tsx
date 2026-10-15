"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { apiRequest } from "@/features/auth/auth-api";
import {
  usePrivateData,
  usePrivateMutation,
  mutationMessage,
} from "@/features/marketplace/private-api";
import type { GiftEvent } from "./event-admin";
import "./gift-report-admin.css";

type Item = {
  eventId: string;
  code: string;
  title: string;
  issued: number;
  redeemed: number;
  voided: number;
  expired: number;
  outstanding: number;
  discountVnd: number;
};
type Ops = {
  generatedAt: string;
  from: string;
  to: string;
  events: Item[];
  daily: { day: string; issued: number; redeemed: number }[];
  deliveries: { channel: string; status: string; count: number }[];
  lowStock: { eventId: string; prizeId: string; name: string; stockLeft: number }[];
};
type Failed = {
  rewardId: string;
  eventId: string;
  channel: string;
  attempts: number;
  issuedAt: string;
};

const vi = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
export function GiftOperationsAdmin() {
  const { user, accessToken } = useAuth();
  const authorized = user?.roles.includes("SUPER_ADMIN") === true;
  const events = usePrivateData<GiftEvent[]>("/admin/gift-events", authorized);
  const [eventId, setEventId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [retryReason, setRetryReason] = useState("");
  const [retryRow, setRetryRow] = useState<Failed | null>(null);
  const mutation = usePrivateMutation();
  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  if (from) params.set("from", new Date(`${from}T00:00:00+07:00`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59+07:00`).toISOString());
  const query = params.toString() ? `?${params}` : "";
  const data = usePrivateData<Ops>(`/admin/gift-event-operations${query}`, authorized);
  const failed = usePrivateData<Failed[]>(
    `/admin/gift-event-operations/notifications/failed${query}`,
    authorized,
  );
  async function exportCsv() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await apiRequest(
        `/admin/gift-event-operations/csv${query}`,
        { method: "GET", cache: "no-store" },
        accessToken,
      );
      if (!response.ok) throw new Error("EXPORT_FAILED");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "moc-maria-event-operations.csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setNotice("Chưa xuất được CSV.");
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    if (!retryRow || retryReason.trim().length < 10) return;
    setNotice("");
    try {
      await mutation.mutateAsync({
        path: `/admin/gift-event-operations/notifications/${retryRow.rewardId}/${retryRow.channel}/retry`,
        method: "POST",
        body: { reason: retryReason.trim() },
      });
      setNotice("Đã yêu cầu thử gửi lại; trạng thái sẽ được cập nhật trong outbox.");
      setRetryRow(null);
      setRetryReason("");
      void failed.refetch();
      void data.refetch();
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  if (!authorized) return <p role="alert">Chỉ Super Admin được xem vận hành Event.</p>;
  return (
    <main className="mm-gr">
      <div className="mm-gr-wrap">
        <Link className="mm-gr-back" href="/quan-tri/su-kien">
          ← Quản lý sự kiện
        </Link>
        <header>
          <span>EVENT OPERATIONS · MỘC MARIA</span>
          <h1>Trung tâm vận hành voucher</h1>
          <p>
            Thống kê phát thưởng, sử dụng, doanh số ưu đãi được ghi nhận và tình trạng thông báo.
            Tất cả thời gian hiển thị theo giờ Việt Nam.
          </p>
        </header>
        <div className="mm-gr-toolbar" style={{ flexWrap: "wrap" }}>
          <label>
            Sự kiện
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Tất cả sự kiện</option>
              {events.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Từ ngày
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Theo tháng
            <input
              type="month"
              value={month}
              onChange={(e) => {
                const value = e.target.value;
                setMonth(value);
                setYear("");
                if (value) {
                  const [y, m] = value.split("-").map(Number);
                  setFrom(`${y}-${String(m).padStart(2, "0")}-01`);
                  setTo(`${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`);
                }
              }}
            />
          </label>
          <label>
            Theo năm
            <select
              value={year}
              onChange={(e) => {
                const value = e.target.value;
                setYear(value);
                setMonth("");
                if (value) {
                  setFrom(`${value}-01-01`);
                  setTo(`${value}-12-31`);
                }
              }}
            >
              <option value="">Chọn năm</option>
              {[2026, 2027, 2028].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy || !data.data} onClick={() => void exportCsv()}>
            {busy ? "Đang xuất…" : "Xuất CSV"}
          </button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {(data.isError || failed.isError) && (
          <p role="alert">Không tải được báo cáo. Kiểm tra Event API và khoảng ngày đã chọn.</p>
        )}
        {data.isPending && <p role="status">Đang tải số liệu…</p>}
        {data.data && (
          <>
            <div className="mm-gr-stats">
              {[
                {
                  label: "Voucher đã phát",
                  value: data.data.events.reduce((n, e) => n + e.issued, 0),
                },
                {
                  label: "Đã sử dụng",
                  value: data.data.events.reduce((n, e) => n + e.redeemed, 0),
                },
                {
                  label: "Chưa sử dụng",
                  value: data.data.events.reduce((n, e) => n + e.outstanding, 0),
                },
                {
                  label: "Giá trị giảm đã ghi nhận (đ)",
                  value: data.data.events.reduce((n, e) => n + e.discountVnd, 0),
                },
              ].map((s) => (
                <div key={s.label}>
                  <small>{s.label}</small>
                  <strong>{vi(s.value)}</strong>
                </div>
              ))}
            </div>
            <h2>Thống kê theo chương trình</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Sự kiện</th>
                    <th>Đã cấp</th>
                    <th>Đã dùng</th>
                    <th>Hết hạn</th>
                    <th>Thu hồi</th>
                    <th>Giảm thực tế</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.events.map((e) => (
                    <tr key={e.eventId}>
                      <td>{e.title}</td>
                      <td>{vi(e.issued)}</td>
                      <td>{vi(e.redeemed)}</td>
                      <td>{vi(e.expired)}</td>
                      <td>{vi(e.voided)}</td>
                      <td>{vi(e.discountVnd)}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h2>Theo ngày</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Phát</th>
                    <th>Đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.daily.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{vi(d.issued)}</td>
                      <td>{vi(d.redeemed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h2>Thông báo Zalo và email</h2>
            <p>
              {data.data.deliveries
                .map((s) => `${s.channel} · ${s.status}: ${vi(s.count)}`)
                .join(" | ") || "Chưa có thông báo trong kỳ."}
            </p>
            <h2>Cảnh báo tồn quà thấp</h2>
            {data.data.lowStock.length ? (
              data.data.lowStock.map((s) => (
                <p key={s.prizeId}>
                  {s.name} - còn {vi(s.stockLeft)} voucher
                </p>
              ))
            ) : (
              <p>Không có phần thưởng dưới ngưỡng cảnh báo.</p>
            )}
          </>
        )}
        <h2>Thông báo gửi lỗi cần kiểm tra</h2>
        {failed.data?.length ? (
          <div>
            {failed.data.map((n) => (
              <p key={n.rewardId + n.channel}>
                {n.channel.toUpperCase()} · Mã tham chiếu {n.rewardId.slice(0, 8)} · {n.attempts}{" "}
                lần thử
                <button
                  type="button"
                  onClick={() => {
                    setRetryRow(n);
                    setRetryReason("");
                  }}
                >
                  Thử gửi lại
                </button>
              </p>
            ))}
          </div>
        ) : (
          <p>Không có thông báo ở trạng thái lỗi trong khoảng thời gian này.</p>
        )}
        {retryRow && (
          <section
            aria-label="Gửi lại thông báo"
            style={{ padding: 16, border: "1px solid currentColor", borderRadius: 12 }}
          >
            <h3>Xác nhận gửi lại qua {retryRow.channel}</h3>
            <label>
              Lý do (tối thiểu 10 ký tự)
              <textarea value={retryReason} onChange={(e) => setRetryReason(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={mutation.isPending || retryReason.trim().length < 10}
              onClick={() => void retry()}
            >
              Xác nhận gửi lại
            </button>
            <button type="button" onClick={() => setRetryRow(null)}>
              Hủy
            </button>
          </section>
        )}
        <p>
          <small>
            Trạng thái “queued” nghĩa là đã chuyển tới hệ thống gửi, không đồng nghĩa người nhận đã
            đọc. Giá trị giảm được đối soát theo phiếu tại quầy, không thay thế xác nhận thanh toán.
          </small>
        </p>
      </div>
    </main>
  );
}
