"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveApiBaseUrl } from "@/shared/config/environment";
import { usePrivateMutation, mutationMessage } from "./private-api";
import { formatPrice } from "./format";
import type { ServiceDetail } from "./types";
import type { BookingView } from "./booking-portal";

interface Slot {
  startsAt: string;
  endsAt: string;
  providerApplicationId: string;
  providerName: string;
  totalVnd: string;
}
interface Preview {
  date: string;
  reservation: false;
  requestEnabled: boolean;
  blockers: string[];
  slots: Slot[];
  search?: { fromDate: string; throughDate: string; hasMoreDates: boolean };
}
const vnDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const bookingTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const hour = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function BookingRequest({ detail }: { detail: ServiceDetail }) {
  const { user, status } = useAuth();
  const [variantId, setVariantId] = useState(detail.variants[0]?.id || "");
  const [branchId, setBranchId] = useState(detail.branches[0]?.branch.id || "");
  const [date, setDate] = useState(vnDate);
  const [anyProvider, setAnyProvider] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [notes, setNotes] = useState("");
  const [earliest, setEarliest] = useState(false);
  const [created, setCreated] = useState<BookingView | null>(null);
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const mutation = usePrivateMutation<BookingView>();
  const query = new URLSearchParams({ variantId, branchId, date });
  const availability = useQuery<Preview>({
    queryKey: ["booking-preview", branchId, variantId, date, earliest],
    enabled: !!branchId && !!variantId && /^\d{4}-\d{2}-\d{2}$/.test(date),
    retry: false,
    queryFn: async () => {
      const response = await fetch(
        resolveApiBaseUrl() + (earliest ? "/availability/earliest?" : "/availability?") + query,
        { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw new Error("Chưa tải được lịch trống. Vui lòng thử lại.");
      return response.json() as Promise<Preview>;
    },
  });
  function resetSelection() {
    setSelected(null);
    setAccepted(false);
    setCreated(null);
    mutation.reset();
    setEarliest(false);
  }
  const slots = availability.data?.slots || [];
  const displayed = anyProvider
    ? slots.filter(
        (slot, index) =>
          slots.findIndex((candidate) => candidate.startsAt === slot.startsAt) === index,
      )
    : slots;
  if (!detail.variants.length || !detail.branches.length) return null;
  return (
    <section className="market-panel mt-8" aria-labelledby="booking-heading">
      <p className="moc-eyebrow">MỘT KHOẢNG LẶNG CHO BẠN</p>
      <h2 id="booking-heading">
        <CalendarDays size={22} className="inline mr-2" />
        Hẹn lịch tại cơ sở
      </h2>
      <p className="market-notice">
        Chọn lịch, gửi yêu cầu và chờ chuyên viên nhận. Lịch chỉ được xác nhận khi bạn đồng ý báo
        giá cuối cùng.
      </p>
      <div className="grid gap-4 sm:grid-cols-3 my-6">
        <label className="grid gap-2 font-medium">
          Gói chăm sóc
          <select
            className="rounded-xl border p-3 bg-white w-full"
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              resetSelection();
            }}
            disabled={mutation.isPending}
          >
            {detail.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.durationMinutes} phút
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 font-medium">
          Cơ sở
          <select
            className="rounded-xl border p-3 bg-white w-full"
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              resetSelection();
            }}
            disabled={mutation.isPending}
          >
            {detail.branches.map(({ branch }) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 font-medium">
          Ngày mong muốn
          <input
            className="rounded-xl border p-3 bg-white w-full min-w-0"
            type="date"
            min={vnDate()}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              resetSelection();
            }}
            disabled={mutation.isPending}
          />
        </label>
      </div>
      <label className="flex gap-3 items-center mb-5">
        <input
          type="checkbox"
          checked={anyProvider}
          onChange={(event) => {
            setAnyProvider(event.target.checked);
            setSelected(null);
            setAccepted(false);
          }}
          disabled={mutation.isPending}
        />
        Để Mộc chọn chuyên viên phù hợp còn lịch trống
      </label>
      {availability.isFetching && <p role="status">Đang kiểm tra lịch trống…</p>}
      {availability.isError && <p role="alert">{availability.error.message}</p>}
      {availability.data && !availability.isFetching && !slots.length && (
        <p role="status" className="market-notice">
          {availability.data.blockers.includes("BOOKING_CONFIGURATION_PENDING")
            ? "Mộc đang chuẩn bị lịch cho gói này tại cơ sở. Bạn có thể chọn cơ sở hoặc gói khác."
            : "Chưa có khung giờ phù hợp trong ngày đã chọn."}
          {availability.data.search && (
            <>
              {" "}
              Đã kiểm tra từ {availability.data.search.fromDate} đến{" "}
              {availability.data.search.throughDate}.
              {availability.data.search.hasMoreDates
                ? " Bạn có thể chọn ngày tiếp theo để kiểm tra thêm."
                : ""}
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          className="market-button"
          onClick={() => {
            setSelected(null);
            setAccepted(false);
            setEarliest(true);
          }}
          disabled={availability.isFetching || mutation.isPending}
        >
          Tìm lịch gần nhất
        </button>
        <button
          type="button"
          className="market-button"
          onClick={() => {
            setSelected(null);
            setAccepted(false);
            void availability.refetch();
          }}
          disabled={availability.isFetching || mutation.isPending}
        >
          <RefreshCw size={16} />
          Kiểm tra lại
        </button>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4"
        aria-label="Các khung giờ còn trống"
      >
        {!availability.isFetching &&
          displayed.map((slot) => (
            <button
              type="button"
              key={slot.startsAt + slot.providerApplicationId}
              aria-pressed={
                selected?.startsAt === slot.startsAt &&
                selected?.providerApplicationId === slot.providerApplicationId
              }
              className={`border rounded-2xl p-4 text-left transition ${selected?.startsAt === slot.startsAt && selected?.providerApplicationId === slot.providerApplicationId ? "bg-[#e5eddc] border-[#526444] ring-2 ring-[#526444]" : "bg-white border-[#d0d4c1] hover:bg-[#f3f5ec]"}`}
              onClick={() => {
                setSelected(slot);
                setAccepted(false);
                setCreated(null);
                mutation.reset();
              }}
              disabled={mutation.isPending || !!created}
            >
              <strong className="block">
                {hour(slot.startsAt)}–{hour(slot.endsAt)}
              </strong>
              <span className="block text-sm mt-1">
                {anyProvider ? "Chuyên viên phù hợp" : slot.providerName}
              </span>
              <span className="block text-sm mt-2">{formatPrice(slot.totalVnd)}</span>
            </button>
          ))}
      </div>
      {selected && !created && (
        <form
          className="mt-6 border rounded-2xl bg-[#f5f6ed] p-5 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!accepted || !user || mutation.isPending) return;
            const payload = {
              variantId,
              branchId,
              startsAt: selected.startsAt,
              ...(anyProvider ? {} : { providerApplicationId: selected.providerApplicationId }),
              expectedTotalVnd: selected.totalVnd,
              quoteAcknowledged: true,
              notes: notes.trim(),
            };
            const fingerprint = JSON.stringify(payload);
            if (requestKey.current?.fingerprint !== fingerprint)
              requestKey.current = { fingerprint, key: crypto.randomUUID() };
            try {
              setCreated(
                await mutation.mutateAsync({
                  path: "/bookings/requests",
                  body: { ...payload, idempotencyKey: requestKey.current.key },
                }),
              );
            } catch {
              /* Render the mutation error and preserve the retry key. */
            }
          }}
        >
          <h3 className="font-semibold text-lg">Xem lại yêu cầu của bạn</h3>
          <p>
            {bookingTime(selected.startsAt)} ·{" "}
            {detail.variants.find((v) => v.id === variantId)?.name}
          </p>
          <dl className="grid grid-cols-2 gap-2">
            <dt>Gói chăm sóc</dt>
            <dd className="text-right">{formatPrice(selected.totalVnd)}</dd>
            <dt>Phí di chuyển</dt>
            <dd className="text-right">{formatPrice("0")}</dd>
            <dt className="font-semibold">Tổng giá hiện tại</dt>
            <dd className="text-right font-semibold">{formatPrice(selected.totalVnd)}</dd>
          </dl>
          <label className="grid gap-2">
            Ghi chú riêng cho lịch hẹn
            <textarea
              className="border rounded-xl p-3 bg-white"
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <span className="text-sm">
              Chuyên viên chỉ thấy ghi chú sau khi lịch được xác nhận. Tránh gửi thông tin sức khỏe
              nhạy cảm tại đây.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              required
              className="mt-1"
            />
            Tôi đồng ý giá hiện tại để gửi yêu cầu. Tôi sẽ kiểm tra và xác nhận báo giá cuối cùng
            sau khi chuyên viên nhận.
          </label>
          {status === "anonymous" ? (
            <Link
              href={`/dang-nhap?returnTo=${encodeURIComponent("/dich-vu/" + detail.service.slug)}`}
              className="market-button"
            >
              Đăng nhập để gửi yêu cầu
            </Link>
          ) : user?.permissions.includes("customer.portal") ? (
            <button
              className="market-button"
              type="submit"
              disabled={!accepted || mutation.isPending || user.mustChangePassword}
            >
              {mutation.isPending ? "Đang gửi yêu cầu…" : "Gửi yêu cầu đặt lịch"}
            </button>
          ) : (
            <p>Tài khoản này chưa có quyền đặt lịch khách hàng.</p>
          )}
          {user?.mustChangePassword && (
            <Link href="/tai-khoan">Đổi mật khẩu trước khi gửi yêu cầu</Link>
          )}
          {mutation.isError && (
            <p role="alert">
              {mutationMessage(mutation.error)} Hãy kiểm tra lại lịch và giá trước khi thử lại.
            </p>
          )}
        </form>
      )}
      {created && (
        <div className="market-notice mt-6" role="status">
          <CheckCircle2 size={22} />
          <strong>Đã gửi yêu cầu. Đang chờ chuyên viên nhận.</strong>
          <p>
            Hạn giữ yêu cầu: {bookingTime(created.requestExpiresAt)}. Bạn cần xác nhận báo giá trong
            thời hạn này để hoàn tất.
          </p>
          <Link href="/lich-hen" className="market-button mt-3">
            Theo dõi và xác nhận báo giá
          </Link>
        </div>
      )}
    </section>
  );
}
