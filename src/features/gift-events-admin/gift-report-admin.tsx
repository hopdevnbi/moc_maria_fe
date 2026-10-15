"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Download,
  Gift,
  ShieldAlert,
  CheckCircle2,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { apiRequest } from "@/features/auth/auth-api";
import { usePrivateData } from "@/features/marketplace/private-api";
import type { GiftEvent } from "./event-admin";
import "./gift-report-admin.css";

type ReportPrize = {
  id: string;
  name: string;
  kind: string;
  stockTotal: number;
  stockIssued: number;
  actualIssued: number;
  redeemed: number;
  expired: number;
  liabilityVnd: number;
  stockDelta: number;
};
type Report = {
  eventId: string;
  code: string;
  title: string;
  status: string;
  generatedAt: string;
  timezone: string;
  entries: number;
  issued: number;
  redeemed: number;
  expired: number;
  voided: number;
  outstanding: number;
  redemptionHistory: number;
  budgetCapVnd: number;
  budgetReservedVnd: number;
  liabilityIssuedVnd: number;
  discrepancies: string[];
  reconciled: boolean;
  prizes: ReportPrize[];
  branches: Array<{ id: string; name: string; redeemed: number }>;
  daily: Array<{ day: string; issued: number }>;
};
const number = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const currency = (n: number) => number(n) + " ₫";

export function GiftReportAdmin() {
  const { user, accessToken } = useAuth();
  const authorized = user?.roles.includes("SUPER_ADMIN") === true;
  const events = usePrivateData<GiftEvent[]>("/admin/gift-events", authorized);
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = eventId || events.data?.[0]?.id || "";
  const details = usePrivateData<Report>(
    selected ? `/admin/gift-events/${selected}/report` : "/admin/gift-events/none/report",
    authorized && !!selected,
  );

  async function exportCsv() {
    if (!selected || busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await apiRequest(
        `/admin/gift-events/${selected}/report/csv`,
        { method: "GET", cache: "no-store" },
        accessToken,
      );
      if (!response.ok) throw new Error("Download unavailable");
      const blob = await response.blob(),
        url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `moc-maria-event-${selected}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Chưa xuất được CSV. Hãy thử lại khi kết nối ổn định.");
    } finally {
      setBusy(false);
    }
  }
  if (!authorized)
    return (
      <section className="mm-gr">
        <p role="alert">Chỉ Super Admin được xem dữ liệu đối soát.</p>
      </section>
    );
  const data = details.data;
  return (
    <main className="mm-gr">
      <div className="mm-gr-wrap">
        <Link href="/quan-tri/su-kien" className="mm-gr-back">
          <ArrowLeft size={17} /> Quản lý sự kiện
        </Link>
        <header>
          <span>ADMIN · GIFT EVENT</span>
          <h1>Đối soát quà tặng</h1>
          <p>
            Nhật ký tổng hợp, tồn kho, tiền dự phòng và kết quả tại quầy. Không hiển thị dữ liệu cá
            nhân của khách.
          </p>
        </header>
        <div className="mm-gr-toolbar">
          <label>
            Sự kiện
            <select value={selected} onChange={(e) => setEventId(e.target.value)}>
              {!events.data?.length && <option value="">Chưa có sự kiện</option>}
              {events.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} · {e.code}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void exportCsv()} disabled={busy || !data}>
            <Download size={16} />
            {busy ? "Đang xuất…" : "Xuất CSV đối soát"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mm-gr-error">
            {error}
          </p>
        )}
        {(events.isError || details.isError) && (
          <p role="alert" className="mm-gr-error">
            Không tải được dữ liệu đối soát; Event có thể chưa kích hoạt.
          </p>
        )}
        {details.isPending && selected && <p role="status">Đang tải số liệu từ máy chủ…</p>}
        {data && (
          <>
            <div className={"mm-gr-status " + (data.reconciled ? "ok" : "problem")}>
              {data.reconciled ? <CheckCircle2 size={23} /> : <ShieldAlert size={23} />}
              <div>
                <strong>{data.reconciled ? "Đối soát khớp" : "Cần kiểm tra chênh lệch"}</strong>
                <small>
                  {data.reconciled
                    ? "Số lượt, quà, tồn và ngân sách đã cân đối."
                    : data.discrepancies.join(" · ")}
                </small>
              </div>
            </div>
            <div className="mm-gr-stats">
              {[
                { icon: Activity, label: "Lượt mở", value: number(data.entries) },
                { icon: Gift, label: "Quà đã phát", value: number(data.issued) },
                { icon: CheckCircle2, label: "Đã nhận tại quầy", value: number(data.redeemed) },
                {
                  icon: WalletCards,
                  label: "Ngân sách dự phòng",
                  value: currency(data.budgetReservedVnd),
                },
                { icon: ShieldAlert, label: "Quà hết hạn", value: number(data.expired) },
                { icon: Gift, label: "Quà chưa sử dụng", value: number(data.outstanding) },
              ].map(({ icon: Icon, label, value }) => (
                <article key={label}>
                  <Icon size={22} />
                  <small>{label}</small>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <section className="mm-gr-table-wrap">
              <h2>Kho quà và nghĩa vụ còn lại</h2>
              <div className="mm-gr-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Quà</th>
                      <th>Tồn đã dùng</th>
                      <th>Đã cấp</th>
                      <th>Đã nhận</th>
                      <th>Tiền dự phòng</th>
                      <th>Đối soát</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.prizes.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>
                          {number(p.stockIssued)}/{number(p.stockTotal)}
                        </td>
                        <td>{number(p.actualIssued)}</td>
                        <td>{number(p.redeemed)}</td>
                        <td>{currency(p.liabilityVnd)}</td>
                        <td>{p.stockDelta === 0 ? "Khớp" : "Lệch: " + number(p.stockDelta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="mm-gr-cols">
              <section>
                <h2>Nhận quà theo cơ sở</h2>
                {data.branches.length ? (
                  data.branches.map((b) => (
                    <p key={b.id}>
                      {b.name} <strong>{number(b.redeemed)}</strong>
                    </p>
                  ))
                ) : (
                  <p>Chưa có quà được xác nhận tại quầy.</p>
                )}
              </section>
              <section>
                <h2>Quà đã phát theo ngày (giờ Hà Nội)</h2>
                {data.daily.length ? (
                  data.daily.map((d) => (
                    <p key={d.day}>
                      {d.day}
                      <strong>{number(d.issued)}</strong>
                    </p>
                  ))
                ) : (
                  <p>Chưa ghi nhận lượt mở nào.</p>
                )}
              </section>
            </div>
            <small className="mm-gr-updated">
              Dữ liệu tại{" "}
              {new Date(data.generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}{" "}
              · {data.timezone}
            </small>
          </>
        )}
      </div>
    </main>
  );
}
