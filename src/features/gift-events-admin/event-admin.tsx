"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  CirclePause,
  Crown,
  Gift,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";
import "./event-admin.css";
import { GiftPrizesAdmin } from "./gift-prizes-admin";

export type GiftStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED" | "ARCHIVED";
export type GiftEvent = {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string;
  heroUrl: string | null;
  termsText: string;
  termsVersion: number;
  status: GiftStatus;
  effectiveStatus: GiftStatus;
  startAt: string | null;
  endAt: string | null;
  serverNow: string;
  eligibleTiers: string[];
  budgetCapVnd: number;
  budgetReservedVnd: number;
  guaranteePrize: true;
  maxOpensPerUser: 1;
  version: number;
};
const statuses: Record<GiftStatus, string> = {
  DRAFT: "Bản nháp",
  SCHEDULED: "Sắp diễn ra",
  LIVE: "Đang diễn ra",
  PAUSED: "Tạm dừng",
  ENDED: "Đã kết thúc",
  ARCHIVED: "Lưu trữ",
};
const actions: Record<string, string> = {
  PUBLISH: "Công bố / Lên lịch",
  PAUSE: "Tạm dừng",
  RESUME: "Tiếp tục",
  END: "Kết thúc",
  ARCHIVE: "Lưu trữ",
};
type FormValue = {
  code: string;
  slug: string;
  title: string;
  description: string;
  termsText: string;
  startAt: string;
  endAt: string;
  budgetCapVnd: string;
  eligibleTiers: string[];
  heroUrl: string;
};
const fresh: FormValue = {
  code: "",
  slug: "",
  title: "",
  description: "",
  termsText: "",
  startAt: "",
  endAt: "",
  budgetCapVnd: "0",
  eligibleTiers: ["STANDARD"],
  heroUrl: "",
};
const fromVietnam = (s: string | null): string =>
  s ? new Date(new Date(s).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";
const toUtc = (s: string): string | undefined =>
  s ? new Date(s + ":00+07:00").toISOString() : undefined;
function fromEvent(event: GiftEvent): FormValue {
  return {
    code: event.code,
    slug: event.slug,
    title: event.title,
    description: event.description,
    termsText: event.termsText,
    heroUrl: event.heroUrl || "",
    startAt: fromVietnam(event.startAt),
    endAt: fromVietnam(event.endAt),
    budgetCapVnd: String(event.budgetCapVnd),
    eligibleTiers: event.eligibleTiers,
  };
}

export function GiftEventAdmin() {
  const { user } = useAuth();
  const isSuper = !!user?.roles.includes("SUPER_ADMIN");
  const events = usePrivateData<GiftEvent[]>("/admin/gift-events", isSuper);
  const mutation = usePrivateMutation<GiftEvent>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValue>(fresh);
  const [tierInput, setTierInput] = useState("VIP1");
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const current = events.data?.find((event) => event.id === selectedId) || null;
  const editable = !current || ["DRAFT", "SCHEDULED"].includes(current.status);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(current ? fromEvent(current) : fresh),
    [form, current],
  );
  const disabled = mutation.isPending || !isSuper;
  const set = (key: keyof FormValue, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const choose = (event: GiftEvent) => {
    setSelectedId(event.id);
    setForm(fromEvent(event));
    setNotice("");
    setReason("");
    setStep(1);
  };
  const reset = () => {
    setSelectedId(null);
    setForm(fresh);
    setNotice("");
    setReason("");
    setStep(1);
  };
  const payload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    heroUrl: form.heroUrl.trim() || undefined,
    termsText: form.termsText.trim(),
    startAt: toUtc(form.startAt),
    endAt: toUtc(form.endAt),
    budgetCapVnd: Math.floor(Number(form.budgetCapVnd)),
    eligibleTiers: form.eligibleTiers,
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      disabled ||
      !form.title.trim() ||
      !form.eligibleTiers.length ||
      Number(form.budgetCapVnd) < 0
    )
      return;
    try {
      const res = await mutation.mutateAsync({
        path: current ? `/admin/gift-events/${current.id}` : "/admin/gift-events",
        method: current ? "PATCH" : "POST",
        body: current
          ? { ...payload(), expectedVersion: current.version, reason: reason.trim() }
          : { ...payload(), code: form.code.trim(), slug: form.slug.trim() },
      });
      setSelectedId(res.id);
      setNotice("Đã lưu cấu hình. Hãy kiểm tra kho quà và điều lệ trước khi công bố.");
      setForm(fromEvent(res));
      setReason("");
      await events.refetch();
    } catch {
      /* keep form for retry */
    }
  }

  async function transition(action: string) {
    if (!current || disabled || reason.trim().length < 10) return;
    const description = actions[action] || action;
    if (
      !window.confirm(
        `Xác nhận: ${description} sự kiện "${current.title}"? Mọi thay đổi được ghi nhật ký.`,
      )
    )
      return;
    try {
      const result = await mutation.mutateAsync({
        path: `/admin/gift-events/${current.id}/actions/${action}`,
        body: { expectedVersion: current.version, reason: reason.trim() },
      });
      setNotice(`Đã thực hiện: ${description}. Trạng thái: ${statuses[result.effectiveStatus]}.`);
      setForm(fromEvent(result));
      setReason("");
      await events.refetch();
    } catch {
      /* show API error */
    }
  }

  if (!isSuper)
    return (
      <p role="alert" className="mm-ge-alert">
        Chỉ Super Admin có quyền cấu hình sự kiện mở quà.
      </p>
    );
  return (
    <div className="mm-ge-admin">
      <section className="mm-ge-feature-head">
        <div className="mm-ge-head-icon">
          <Gift size={28} />
        </div>
        <div>
          <span className="mm-ge-eyebrow">EVENT MANAGEMENT · KHU VƯỜN AN NHIÊN</span>
          <h2>Sự kiện mở hộp quà</h2>
          <p>
            Chủ động cấu hình thời gian, hạng khách, thể lệ và ngân sách; phát quà hoàn toàn do
            backend quyết định.
          </p>
        </div>
        <Link className="mm-ge-report-link" href="/quan-tri/su-kien/bao-cao">
          Đối soát & báo cáo
        </Link>
        <Link className="mm-ge-report-link" href="/quan-tri/su-kien/voucher">
          Quản lý voucher
        </Link>
        <Link className="mm-ge-report-link" href="/quan-tri/su-kien/van-hanh">
          Vận hành Event
        </Link>
        <span className="mm-ge-shield">
          <ShieldCheck size={15} /> Super Admin
        </span>
      </section>
      {notice && (
        <p className="mm-ge-notice" role="status">
          {notice}
        </p>
      )}
      {events.isError && (
        <div className="mm-ge-alert" role="alert">
          API sự kiện chưa sẵn sàng hoặc tính năng đang tắt. Bản cấu hình sẽ chỉ hoạt động sau khi
          migration được áp dụng trong môi trường đã duyệt và bật GIFT_EVENTS_ENABLED.
          <button type="button" onClick={() => void events.refetch()}>
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}
      <div className="mm-ge-layout">
        <aside className="mm-ge-sidebar">
          <div className="mm-ge-sidebar-head">
            <h3>Chiến dịch</h3>
            <button type="button" onClick={reset}>
              <Plus size={16} /> Tạo mới
            </button>
          </div>
          {events.isPending && <p>Đang tải sự kiện…</p>}
          {events.data?.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item)}
              className={"mm-ge-event-card" + (current?.id === item.id ? " selected" : "")}
              aria-pressed={current?.id === item.id}
            >
              <span className="mm-ge-event-title">{item.title}</span>
              <span>{statuses[item.effectiveStatus]}</span>
              <small>
                Phiên bản {item.version} ·{" "}
                {item.eligibleTiers.join(", ").replace("STANDARD", "THƯỜNG")}
              </small>
            </button>
          ))}
          {!events.isPending && !events.data?.length && (
            <p>Chưa có sự kiện. Chọn “Tạo mới” để bắt đầu.</p>
          )}
        </aside>
        <section className="mm-ge-editor">
          <div className="mm-ge-editor-header">
            <div>
              <span>WIZARD B1–B5</span>
              <h3>{current ? "Chỉnh sửa chiến dịch" : "Tạo bản nháp"}</h3>
            </div>
            <span className="mm-ge-label">
              {current ? statuses[current.effectiveStatus] : "Chưa lưu"}
            </span>
          </div>
          <div className="mm-ge-steps" role="group" aria-label="Các bước cấu hình">
            {[
              ["Thông tin", 1],
              ["Thời gian", 2],
              ["Hạng khách", 3],
              ["Kho quà", 4],
              ["Kiểm tra", 5],
            ].map(([label, n]) => (
              <button
                key={String(n)}
                type="button"
                aria-pressed={step === n}
                onClick={() => setStep(Number(n))}
                className={step === n ? "active" : ""}
              >
                {String(n).padStart(2, "0")} · {label}
              </button>
            ))}
          </div>
          <form className="mm-ge-form" onSubmit={(e) => void save(e)}>
            {step === 1 && (
              <div className="mm-ge-fields">
                <label>
                  Tên sự kiện{" "}
                  <input
                    required
                    minLength={4}
                    maxLength={160}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Mở hộp quà – Nhận yêu thương"
                    disabled={!editable}
                  />
                </label>
                <label>
                  Mã sự kiện (không dấu, duy nhất){" "}
                  <input
                    required={!current}
                    pattern="[a-z0-9][a-z0-9-]{2,59}"
                    disabled={!!current || !editable}
                    value={form.code}
                    onChange={(e) => set("code", e.target.value)}
                    placeholder="tri-an-thang-10"
                  />
                </label>
                <label>
                  Slug landing{" "}
                  <input
                    required={!current}
                    pattern="[a-z0-9][a-z0-9-]{2,79}"
                    disabled={!!current || !editable}
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder="qua-an-nhien"
                  />
                </label>
                <label>
                  Ảnh bìa (URL CDN HTTPS)
                  <input
                    value={form.heroUrl}
                    onChange={(e) => set("heroUrl", e.target.value)}
                    placeholder="https://.../event/banner.webp"
                    disabled={!editable}
                  />
                </label>
                <label className="wide">
                  Giới thiệu{" "}
                  <textarea
                    rows={3}
                    maxLength={4000}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    disabled={!editable}
                  />
                </label>
                <label className="wide">
                  Điều lệ (bắt buộc trước công bố){" "}
                  <textarea
                    rows={5}
                    maxLength={20000}
                    value={form.termsText}
                    onChange={(e) => set("termsText", e.target.value)}
                    placeholder="Thời gian, đối tượng, điều kiện nhận quà, địa điểm..."
                    disabled={!editable}
                  />
                </label>
              </div>
            )}
            {step === 2 && (
              <div className="mm-ge-fields">
                <label>
                  <CalendarDays size={15} /> Bắt đầu – giờ Việt Nam{" "}
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => set("startAt", e.target.value)}
                    disabled={!editable}
                  />
                </label>
                <label>
                  <CalendarDays size={15} /> Kết thúc – giờ Việt Nam{" "}
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    min={form.startAt}
                    onChange={(e) => set("endAt", e.target.value)}
                    disabled={!editable}
                  />
                </label>
                <label>
                  Tổng ngân sách tối đa (VND){" "}
                  <input
                    inputMode="numeric"
                    type="number"
                    min={0}
                    max={100000000000}
                    step={1}
                    value={form.budgetCapVnd}
                    onChange={(e) => set("budgetCapVnd", e.target.value)}
                    disabled={!editable}
                  />
                </label>
                <p className="wide">
                  Máy chủ lưu thời gian UTC, người dùng nhìn thấy theo Asia/Ho_Chi_Minh. Khi event
                  LIVE, không chỉnh hạng hay ngân sách bằng biểu mẫu này.
                </p>
              </div>
            )}
            {step === 3 && (
              <div className="mm-ge-tiers">
                <span className="mm-ge-eyebrow">CHỌN CHÍNH XÁC TỪNG HẠNG</span>
                <label className="mm-ge-tier-row">
                  <input
                    type="checkbox"
                    checked={form.eligibleTiers.includes("STANDARD")}
                    disabled={!editable}
                    onChange={(e) =>
                      set(
                        "eligibleTiers",
                        e.target.checked
                          ? [...form.eligibleTiers, "STANDARD"]
                          : form.eligibleTiers.filter((x) => x !== "STANDARD"),
                      )
                    }
                  />
                  <span>
                    THƯỜNG <small>Mặc định được chọn khi tạo mới</small>
                  </span>
                </label>
                <div className="mm-ge-tier-choose">
                  <select
                    aria-label="Chọn hạng VIP"
                    value={tierInput}
                    disabled={!editable}
                    onChange={(e) => setTierInput(e.target.value)}
                  >
                    {Array.from({ length: 99 }, (_, i) => (
                      <option key={i + 1} value={`VIP${i + 1}`}>
                        VIP{i + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!editable || form.eligibleTiers.includes(tierInput)}
                    onClick={() => set("eligibleTiers", [...form.eligibleTiers, tierInput])}
                  >
                    Thêm hạng
                  </button>
                </div>
                <div className="mm-ge-tier-chips">
                  {form.eligibleTiers
                    .filter((x) => x !== "STANDARD")
                    .map((tier) => (
                      <button
                        type="button"
                        key={tier}
                        disabled={!editable}
                        onClick={() =>
                          set(
                            "eligibleTiers",
                            form.eligibleTiers.filter((x) => x !== tier),
                          )
                        }
                      >
                        <Crown size={14} />
                        {tier} ×
                      </button>
                    ))}
                </div>
                <p>
                  Chọn VIP2 không có nghĩa VIP1 hoặc VIP3 được tham gia. Quyền được kiểm tra lại
                  trên máy chủ tại thời điểm mở.
                </p>
              </div>
            )}
            {step === 5 && (
              <div className="mm-ge-review">
                <h4>Xem lại trước khi công bố</h4>
                <dl>
                  <dt>Sự kiện</dt>
                  <dd>{form.title || "Chưa đặt tên"}</dd>
                  <dt>Hạng được tham gia</dt>
                  <dd>
                    {form.eligibleTiers.join(", ").replace("STANDARD", "THƯỜNG") || "Chưa chọn"}
                  </dd>
                  <dt>Ngân sách</dt>
                  <dd>{Number(form.budgetCapVnd || 0).toLocaleString("vi-VN")} ₫</dd>
                  <dt>Số lượt</dt>
                  <dd>1 lượt/tài khoản/event</dd>
                  <dt>Đảm bảo có quà</dt>
                  <dd>Đúng · chỉ khi còn quà hợp lệ</dd>
                </dl>
                <p>
                  Không cho công bố nếu thiếu điều lệ, thời gian, ngân sách hoặc quà hợp lệ. Voucher
                  và tiền mặt không tự động thanh toán qua booking.
                </p>
              </div>
            )}
            {step !== 4 && current && editable && isDirty && (
              <label className="mm-ge-reason">
                Lý do thay đổi bản nháp (10–500 ký tự)
                <input
                  minLength={10}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="Cập nhật cấu hình theo yêu cầu vận hành"
                />
              </label>
            )}
            {mutation.isError && (
              <p className="mm-ge-error" role="alert">
                {mutationMessage(mutation.error)}
              </p>
            )}
            {editable && step !== 4 && (
              <button
                type="submit"
                className="mm-ge-save"
                disabled={
                  disabled ||
                  !form.eligibleTiers.length ||
                  !form.title.trim() ||
                  (!!current && reason.trim().length < 10)
                }
              >
                <CheckCircle2 size={16} />
                {mutation.isPending
                  ? "Đang lưu…"
                  : current
                    ? "Lưu thay đổi có nhật ký"
                    : "Tạo sự kiện dạng nháp"}
              </button>
            )}
          </form>
          {step === 4 && <GiftPrizesAdmin event={current} />}
          {current && (
            <div className="mm-ge-actions">
              <strong>
                <Sparkles size={16} /> Vận hành chiến dịch
              </strong>
              <p>Nhập lý do tối thiểu 10 ký tự để công bố, tạm dừng, tiếp tục hoặc kết thúc.</p>
              <input
                aria-label="Lý do thao tác sự kiện"
                minLength={10}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Lý do vận hành / phê duyệt"
              />
              <div>
                {(current.effectiveStatus === "DRAFT"
                  ? ["PUBLISH"]
                  : current.effectiveStatus === "SCHEDULED" || current.effectiveStatus === "LIVE"
                    ? ["PAUSE", "END"]
                    : current.status === "PAUSED"
                      ? ["RESUME", "END"]
                      : current.effectiveStatus === "ENDED"
                        ? ["ARCHIVE"]
                        : []
                ).map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={disabled || reason.trim().length < 10}
                    onClick={() => void transition(action)}
                  >
                    <CirclePause size={15} />
                    {actions[action]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      <p className="mm-ge-foot">
        <ShieldCheck size={16} /> Kết quả mở hộp, tồn quà và quyền lợi do máy chủ lưu và kiểm tra.
        Không có random trao giải trên trang quản trị.
      </p>
    </div>
  );
}
