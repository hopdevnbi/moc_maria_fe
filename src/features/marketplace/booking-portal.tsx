"use client";
import Link from "next/link";
import { useState } from "react";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";
import { formatPrice } from "./format";
import { bookingTime } from "./booking-request";

export interface BookingView {
  id: string;
  status: string;
  version: number;
  mode: string;
  startsAt: string;
  endsAt: string;
  requestExpiresAt: string;
  notes: string | null;
  quote: {
    revision: number;
    servicePriceVnd: string;
    travelFeeVnd: string;
    extraFeeVnd: string;
    discountVnd: string;
    totalVnd: string;
    reason: string;
    acceptedAt: string | null;
    snapshot: {
      serviceName?: string;
      variantName?: string;
      providerName?: string;
      branchName?: string;
    };
  };
  history: Array<{
    previousStatus: string | null;
    nextStatus: string;
    reason: string;
    createdAt: string;
  }>;
}
const labels: Record<string, string> = {
  REQUESTED: "Chờ chuyên viên nhận",
  ACCEPTED: "Chờ bạn xác nhận báo giá",
  CUSTOMER_CONFIRMED: "Đã đồng ý báo giá",
  CONFIRMED: "Lịch đã xác nhận",
  DECLINED: "Chuyên viên đã từ chối",
  EXPIRED: "Yêu cầu đã hết hạn",
  CANCELLED: "Đã hủy",
  CHECKED_IN: "Đã đến cơ sở",
  IN_SERVICE: "Đang phục vụ",
  COMPLETED: "Đã hoàn thành",
  NO_SHOW: "Không đến",
};
type PortalRole = "CUSTOMER" | "PROVIDER" | "ADMIN";
const permissions: Record<PortalRole, string> = {
  CUSTOMER: "customer.portal",
  PROVIDER: "staff.portal",
  ADMIN: "roles.manage",
};
export function BookingsPortal({ role = "CUSTOMER" }: { role?: PortalRole }) {
  return (
    <RequireAuth requiredPermissions={[permissions[role]]}>
      <BookingsList role={role} />
    </RequireAuth>
  );
}
function BookingsList({ role }: { role: PortalRole }) {
  const path =
    role === "ADMIN"
      ? "/admin/bookings"
      : role === "PROVIDER"
        ? "/bookings/provider/me"
        : "/bookings/me";
  const data = usePrivateData<BookingView[]>(path, true, 15000);
  return (
    <>
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <Link className="market-button" href="/tai-khoan">
          Tài khoản của tôi
        </Link>
        <button
          className="market-button"
          type="button"
          disabled={data.isFetching}
          onClick={() => void data.refetch()}
        >
          {data.isFetching ? "Đang cập nhật…" : "Cập nhật lịch hẹn"}
        </button>
      </div>
      {data.isPending && <p role="status">Đang tải lịch hẹn…</p>}
      {data.isError && (
        <p role="alert" className="market-notice">
          {mutationMessage(data.error)}
        </p>
      )}
      {data.data && !data.data.length && (
        <section className="market-empty">
          <h2>Chưa có lịch hẹn</h2>
          <p>
            {role === "PROVIDER"
              ? "Yêu cầu được phân cho bạn sẽ xuất hiện tại đây."
              : "Các yêu cầu đặt lịch sẽ được cập nhật tại đây."}
          </p>
          <Link href="/dich-vu">Khám phá gói chăm sóc</Link>
        </section>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {data.data?.map((booking) => (
          <BookingCard key={booking.id + ":" + booking.version} booking={booking} role={role} />
        ))}
      </div>
      {data.data?.length === 100 && (
        <p className="market-notice">
          Đang hiển thị 100 yêu cầu gần nhất. Bộ lọc và lịch sử đầy đủ đang được bổ sung.
        </p>
      )}
    </>
  );
}
function BookingCard({ booking, role }: { booking: BookingView; role: PortalRole }) {
  const mutation = usePrivateMutation<BookingView>();
  const [accepted, setAccepted] = useState(false),
    [reason, setReason] = useState("");
  const [extraFee, setExtraFee] = useState(booking.quote.extraFeeVnd),
    [discount, setDiscount] = useState(booking.quote.discountVnd);
  const [notice, setNotice] = useState("");
  const hold = ["REQUESTED", "ACCEPTED", "CUSTOMER_CONFIRMED"].includes(booking.status);
  const state = booking.status;
  async function submit(action: string, body: unknown, admin = false) {
    try {
      const result = await mutation.mutateAsync({
        path: `${admin ? "/admin/bookings" : "/bookings"}/${booking.id}/${action}`,
        body,
      });
      setNotice(
        result.status === "CONFIRMED"
          ? "Lịch hẹn đã được xác nhận."
          : result.quote.revision !== booking.quote.revision
            ? "Báo giá đã được cập nhật. Hãy xem lại và đồng ý phiên bản mới."
            : labels[result.status] || result.status,
      );
    } catch {
      /* Show API error without changing the booking locally. */
    }
  }
  return (
    <article className="market-panel min-w-0">
      <p className="moc-eyebrow">
        {booking.mode === "AT_BRANCH" ? "CHĂM SÓC TẠI CƠ SỞ" : "CHĂM SÓC TẠI NHÀ"}
      </p>
      <h2>{booking.quote.snapshot.serviceName || "Lịch chăm sóc"}</h2>
      <span className="market-badge mb-4">
        {role === "PROVIDER" && state === "ACCEPTED"
          ? "Chờ khách đồng ý báo giá"
          : labels[state] || state}
      </span>
      <p className="font-semibold">{bookingTime(booking.startsAt)}</p>
      <p>{booking.quote.snapshot.variantName}</p>
      <p>
        {booking.quote.snapshot.branchName} · {booking.quote.snapshot.providerName}
      </p>
      {hold && (
        <p className="market-notice">Hạn giữ yêu cầu: {bookingTime(booking.requestExpiresAt)}.</p>
      )}
      <dl className="grid grid-cols-2 gap-2 border-y py-4 my-5">
        <dt>Gói chăm sóc</dt>
        <dd className="text-right">{formatPrice(booking.quote.servicePriceVnd)}</dd>
        <dt>Phí di chuyển</dt>
        <dd className="text-right">{formatPrice(booking.quote.travelFeeVnd)}</dd>
        <dt>Phụ phí</dt>
        <dd className="text-right">{formatPrice(booking.quote.extraFeeVnd)}</dd>
        <dt>Giảm giá</dt>
        <dd className="text-right">{formatPrice(booking.quote.discountVnd)}</dd>
        <dt className="font-semibold">Tổng báo giá · phiên bản {booking.quote.revision}</dt>
        <dd className="text-right font-semibold">{formatPrice(booking.quote.totalVnd)}</dd>
      </dl>
      <p className="text-sm">{booking.quote.reason}</p>
      {booking.notes && (
        <p className="market-notice whitespace-pre-line">Ghi chú: {booking.notes}</p>
      )}
      {role === "CUSTOMER" && state === "ACCEPTED" && (
        <form
          className="grid gap-4 mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (accepted && !mutation.isPending)
              void submit("confirm-quote", {
                quoteRevision: booking.quote.revision,
                expectedTotalVnd: booking.quote.totalVnd,
                accepted: true,
              });
          }}
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              required
              className="mt-1"
            />
            Tôi đã xem và đồng ý báo giá phiên bản {booking.quote.revision}, tổng{" "}
            {formatPrice(booking.quote.totalVnd)}.
          </label>
          <button
            className="market-button"
            disabled={!accepted || mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Đang xác nhận…" : "Đồng ý báo giá & xác nhận lịch"}
          </button>
        </form>
      )}
      {role === "PROVIDER" && state === "REQUESTED" && (
        <form
          className="grid gap-3 mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!mutation.isPending)
              void submit("provider-decision", {
                decision: "ACCEPT",
                expectedVersion: booking.version,
                reason,
              });
          }}
        >
          <label className="grid gap-2">
            Ghi chú khi nhận hoặc từ chối
            <textarea
              className="rounded-xl border p-3"
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="market-button" type="submit" disabled={mutation.isPending}>
              Nhận yêu cầu
            </button>
            <button
              className="market-button"
              type="button"
              disabled={mutation.isPending || reason.trim().length < 3}
              onClick={() =>
                void submit("provider-decision", {
                  decision: "DECLINE",
                  expectedVersion: booking.version,
                  reason,
                })
              }
            >
              Từ chối yêu cầu
            </button>
          </div>
        </form>
      )}
      {role === "ADMIN" && ["REQUESTED", "ACCEPTED"].includes(state) && (
        <details className="mt-5 border rounded-xl p-4">
          <summary className="cursor-pointer font-semibold">Điều chỉnh phụ phí & giảm giá</summary>
          <form
            className="grid gap-3 mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!mutation.isPending)
                void submit(
                  "quote",
                  {
                    expectedVersion: booking.version,
                    extraFeeVnd: extraFee,
                    discountVnd: discount,
                    reason,
                  },
                  true,
                );
            }}
          >
            <label className="grid gap-2">
              Phụ phí (VND)
              <input
                className="rounded-xl border p-3"
                inputMode="numeric"
                pattern="(0|[1-9][0-9]{0,14})"
                value={extraFee}
                onChange={(event) => setExtraFee(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2">
              Giảm giá (VND)
              <input
                className="rounded-xl border p-3"
                inputMode="numeric"
                pattern="(0|[1-9][0-9]{0,14})"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2">
              Lý do điều chỉnh
              <textarea
                className="rounded-xl border p-3"
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
              />
            </label>
            <p className="text-sm">
              Khách cần đồng ý lại báo giá mới. Thao tác này không xác nhận thay khách.
            </p>
            <button className="market-button" type="submit" disabled={mutation.isPending}>
              Lập phiên bản báo giá mới
            </button>
          </form>
        </details>
      )}
      {notice && (
        <p className="market-notice" role="status">
          {notice}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="market-notice">
          {mutationMessage(mutation.error)}
        </p>
      )}
      <details className="mt-5 border rounded-xl p-4">
        <summary className="cursor-pointer font-semibold">Hành trình yêu cầu</summary>
        <ol className="mt-4 grid gap-3">
          {booking.history.map((entry, index) => (
            <li key={index}>
              <strong>{labels[entry.nextStatus] || entry.nextStatus}</strong>
              <p className="text-sm">
                {bookingTime(entry.createdAt)} · {entry.reason}
              </p>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
