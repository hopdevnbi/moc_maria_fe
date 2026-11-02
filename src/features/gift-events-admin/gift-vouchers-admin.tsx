"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";
import type { GiftEvent } from "./event-admin";
import "./gift-report-admin.css";

type VoucherRow = {
  id: string;
  eventId: string;
  customerId: string;
  name: string;
  kind: string;
  status: "ISSUED" | "REDEEMED" | "EXPIRED" | "VOIDED";
  version: number;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
};

type PrizeStock = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  weight: number;
  stockTotal: number;
  stockIssued: number;
  config: { percent?: number; maxDiscountVnd?: number };
};
export function GiftVouchersAdmin() {
  const { user } = useAuth();
  const authorized = user?.roles.includes("SUPER_ADMIN") === true;
  const events = usePrivateData<GiftEvent[]>("/admin/gift-events", authorized);
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<VoucherRow | null>(null);
  const [notice, setNotice] = useState("");
  const selected = eventId || events.data?.[0]?.id || "";
  const params = new URLSearchParams({ limit: "100" });
  if (status) params.set("status", status);
  if (from) params.set("from", new Date(from + "T00:00:00+07:00").toISOString());
  if (to) params.set("to", new Date(to + "T23:59:59+07:00").toISOString());
  const vouchers = usePrivateData<VoucherRow[]>(
    selected
      ? `/admin/gift-events/${selected}/vouchers?${params}`
      : "/admin/gift-events/none/vouchers",
    authorized && !!selected,
  );
  const prizes = usePrivateData<PrizeStock[]>(
    selected
      ? "/" + "admin/gift-events/" + selected + "/prizes"
      : "/" + "admin/gift-events/none/prizes",
    authorized && !!selected,
  );
  const enabledVouchers =
    prizes.data?.filter((prize) => prize.kind === "VOUCHER_PERCENT" && prize.enabled) ?? [];
  const configuredTotal = enabledVouchers.reduce((sum, prize) => sum + prize.stockTotal, 0);
  const issuedTotal = enabledVouchers.reduce((sum, prize) => sum + prize.stockIssued, 0);
  const mutation = usePrivateMutation();
  async function revoke() {
    if (!selected || !pending || reason.trim().length < 10 || mutation.isPending) return;
    setNotice("");
    try {
      await mutation.mutateAsync({
        path: `/admin/gift-events/${selected}/vouchers/${pending.id}/void`,
        method: "PATCH",
        body: { expectedVersion: pending.version, reason: reason.trim() },
      });
      setPending(null);
      setReason("");
      setNotice("Đã thu hồi voucher và ghi nhật ký.");
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  if (!authorized) return <p role="alert">Chỉ Super Admin được quản lý voucher.</p>;
  return (
    <main className="mm-gr">
      <div className="mm-gr-wrap">
        <Link className="mm-gr-back" href="/quan-tri/su-kien">
          ← Quản lý sự kiện
        </Link>
        <header>
          <span>ADMIN · GIFT EVENT</span>
          <h1>Quản lý voucher đã cấp</h1>
          <p>
            Lọc voucher theo sự kiện, ngày cấp và trạng thái. Voucher đã cấp không được xóa cứng
            hoặc sửa giá trị hồi tố.
          </p>
        </header>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
          <label>
            Sự kiện{" "}
            <select
              value={selected}
              onChange={(e) => {
                setEventId(e.target.value);
                setPending(null);
              }}
            >
              {events.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="ISSUED">Chưa dùng</option>
              <option value="REDEEMED">Đã dùng</option>
              <option value="EXPIRED">Hết hạn</option>
              <option value="VOIDED">Đã thu hồi</option>
            </select>
          </label>
          <label>
            Từ ngày <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Đến ngày{" "}
            <input
              type="date"
              min={from || undefined}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        {vouchers.isPending && <p role="status">Đang tải voucher…</p>}
        {vouchers.isError && <p role="alert">Không thể tải danh sách voucher.</p>}
        {prizes.isError && <p role="alert">Không thể tải số liệu quỹ voucher.</p>}
        {prizes.data && (
          <section className="mm-voucher-inventory" aria-label="Tổng quan quỹ voucher">
            <h2>Quỹ voucher của sự kiện</h2>
            <p>
              Quỹ đã cấu hình khác với voucher thực tế đã cấp. Voucher chỉ phát hành khi khách hàng
              mở quà thành công.
            </p>
            <div className="mm-voucher-summary">
              <article>
                <small>Tổng quỹ đã bật</small>
                <strong>{configuredTotal.toLocaleString("vi-VN")}</strong>
                <span>Suất voucher tối đa</span>
              </article>
              <article>
                <small>Đã phát hành</small>
                <strong>{issuedTotal.toLocaleString("vi-VN")}</strong>
                <span>Đã tính cả voucher dùng/thu hồi</span>
              </article>
              <article>
                <small>Còn trong kho</small>
                <strong>{(configuredTotal - issuedTotal).toLocaleString("vi-VN")}</strong>
                <span>Chưa cấp cho khách</span>
              </article>
            </div>
            {enabledVouchers.length > 0 && (
              <div className="mm-gr-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Loại voucher</th>
                      <th>Quỹ</th>
                      <th>Đã cấp</th>
                      <th>Còn lại</th>
                      <th>Trọng số chọn*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledVouchers
                      .slice()
                      .sort((a, b) => (a.config.percent ?? 0) - (b.config.percent ?? 0))
                      .map((prize) => (
                        <tr key={prize.id}>
                          <td>{prize.name}</td>
                          <td>{prize.stockTotal}</td>
                          <td>{prize.stockIssued}</td>
                          <td>{prize.stockTotal - prize.stockIssued}</td>
                          <td>{prize.weight}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className="mm-voucher-inventory-note">
                  *Trọng số chỉ là tỷ lệ lựa chọn tương đối khi quà còn tồn và đủ ngân sách; không
                  phải tỷ lệ trúng cố định. Voucher đã cấp không được hoàn vào kho khi reset.
                </p>
              </div>
            )}
          </section>
        )}{" "}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Khách hàng (ID)</th>
                <th>Ngày cấp</th>
                <th>Trạng thái</th>
                <th>Quản lý</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.data?.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>
                    <small>{v.customerId.slice(0, 8)}…</small>
                  </td>
                  <td>
                    {new Date(v.issuedAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </td>
                  <td>{v.status}</td>
                  <td>
                    {v.status === "ISSUED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPending(v);
                          setReason("");
                        }}
                      >
                        Thu hồi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vouchers.data?.length === 0 && <p>Không có voucher phù hợp bộ lọc.</p>}
        {pending && (
          <section
            aria-label="Xác nhận thu hồi"
            style={{
              marginTop: 20,
              padding: 16,
              border: "1px solid currentColor",
              borderRadius: 12,
            }}
          >
            <h2>Thu hồi {pending.name}</h2>
            <p>Hành động được lưu vào nhật ký và không hoàn nguyên tự động.</p>
            <label>
              Lý do (tối thiểu 10 ký tự){" "}
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button
                type="button"
                disabled={mutation.isPending || reason.trim().length < 10}
                onClick={() => void revoke()}
              >
                Xác nhận thu hồi
              </button>
              <button type="button" onClick={() => setPending(null)}>
                Hủy
              </button>
            </div>
          </section>
        )}
        {notice && <p role="status">{notice}</p>}
        <p>
          Hiển thị tối đa 100 voucher gần nhất theo bộ lọc. Báo cáo tổng hợp được đối soát riêng.
        </p>
      </div>
    </main>
  );
}
