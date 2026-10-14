"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  usePrivateData,
  usePrivateMutation,
  mutationMessage,
} from "@/features/marketplace/private-api";
import {
  NotificationBadge,
  NotificationNav,
  NotificationSwitch,
  notificationDate,
} from "./notification-ui";

type Recipient = { email: string; enabled: boolean };
export type ChatDigest = {
  enabled: boolean;
  mode: "daily" | "interval";
  hour: number;
  intervalHours: number;
  zalo: boolean;
  email: boolean;
  nextAt: string | null;
  zaloReady: boolean;
  emailReady: boolean;
  pending: number;
  failed: number;
};
type Draft = Pick<ChatDigest, "enabled" | "mode" | "hour" | "intervalHours" | "zalo" | "email">;
const values = (data: ChatDigest): Draft => ({
  enabled: data.enabled,
  mode: data.mode,
  hour: data.hour,
  intervalHours: data.intervalHours,
  zalo: data.zalo,
  email: data.email,
});
type ZaloStatus = { recipientCount: number };

function DigestEditor({ data, refetch }: { data: ChatDigest; refetch: () => Promise<unknown> }) {
  const [draft, setDraft] = useState<Draft>(() => values(data));
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const change = usePrivateMutation();
  const dirty = JSON.stringify(draft) !== JSON.stringify(values(data));
  const valid =
    Number.isInteger(draft.intervalHours) && draft.intervalHours >= 1 && draft.intervalHours <= 168;
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((old) => {
      const next = { ...old, [key]: value };
      if ((key === "mode" && value === "daily") || (key === "enabled" && value === false)) {
        if (
          !Number.isInteger(next.intervalHours) ||
          next.intervalHours < 1 ||
          next.intervalHours > 168
        )
          next.intervalHours = data.intervalHours;
      }
      return next;
    });
    setNotice("");
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || !dirty) return;
    try {
      await change.mutateAsync({ path: "/admin/chat-digest", body: draft });
      await refetch();
      setFailed(false);
      setNotice("Đã lưu lịch báo cáo hội thoại.");
    } catch (error) {
      setFailed(true);
      setNotice(mutationMessage(error));
    }
  }
  const schedule =
    draft.mode === "daily"
      ? `Mỗi ngày lúc ${String(draft.hour).padStart(2, "0")}:00`
      : `Mỗi ${draft.intervalHours || "…"} giờ`;
  return (
    <div className="nt-settings-grid">
      <form className="nt-card nt-schedule" onSubmit={save}>
        <header className="nt-card-heading">
          <div className="nt-heading-icon">
            <CalendarClock size={22} aria-hidden />
          </div>
          <div>
            <span className="nt-eyebrow">TỰ ĐỘNG HÓA</span>
            <h2>Báo cáo chat Khách – KTV</h2>
            <p>Mỗi hội thoại có tin mới, một báo cáo trong mỗi kỳ.</p>
          </div>
        </header>
        <div className="nt-master">
          <div>
            <strong>Bật báo cáo chat</strong>
            <p>
              {draft.enabled
                ? "Hệ thống tự tổng hợp theo lịch bên dưới."
                : "Đang tạm dừng tổng hợp báo cáo."}
            </p>
          </div>
          <NotificationSwitch
            label="Bật báo cáo chat"
            checked={draft.enabled}
            disabled={change.isPending}
            onChange={(value) => update("enabled", value)}
          />
        </div>
        <fieldset disabled={!draft.enabled || change.isPending} className="nt-fieldset">
          <legend>Tần suất báo cáo</legend>
          <div className="nt-mode-options">
            <label className={`nt-mode ${draft.mode === "daily" ? "is-selected" : ""}`}>
              <input
                type="radio"
                name="mode"
                value="daily"
                checked={draft.mode === "daily"}
                onChange={() => update("mode", "daily")}
              />
              <CalendarClock size={20} aria-hidden />
              <strong>Mỗi ngày</strong>
              <small>Một giờ cố định</small>
              <Check className="nt-mode-check" size={15} aria-hidden />
            </label>
            <label className={`nt-mode ${draft.mode === "interval" ? "is-selected" : ""}`}>
              <input
                type="radio"
                name="mode"
                value="interval"
                checked={draft.mode === "interval"}
                onChange={() => update("mode", "interval")}
              />
              <Clock3 size={20} aria-hidden />
              <strong>Theo khoảng giờ</strong>
              <small>Lặp lại sau mỗi kỳ</small>
              <Check className="nt-mode-check" size={15} aria-hidden />
            </label>
          </div>
          {draft.mode === "daily" ? (
            <div className="nt-field">
              <label htmlFor="nt-hour">Giờ báo hằng ngày</label>
              <div className="nt-time-row">
                <select
                  id="nt-hour"
                  value={draft.hour}
                  onChange={(event) => update("hour", Number(event.target.value))}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <span>
                  <Clock3 size={15} aria-hidden />
                  Giờ Việt Nam · UTC+7
                </span>
              </div>
            </div>
          ) : (
            <div className="nt-field">
              <label htmlFor="nt-interval">Khoảng cách giữa các lần báo (giờ)</label>
              <div className="nt-presets">
                {[1, 6, 12, 24].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    aria-pressed={draft.intervalHours === hours}
                    onClick={() => update("intervalHours", hours)}
                  >
                    {hours} giờ
                  </button>
                ))}
              </div>
              <div className="nt-time-row">
                <input
                  id="nt-interval"
                  type="number"
                  required
                  min={1}
                  max={168}
                  value={draft.intervalHours || ""}
                  onChange={(event) => update("intervalHours", Number(event.target.value))}
                />
                <span>Từ 1 đến 168 giờ</span>
              </div>
              {!valid && (
                <p className="nt-error" role="alert">
                  Nhập số giờ nguyên từ 1 đến 168.
                </p>
              )}
            </div>
          )}
          <div className="nt-section-label">Kênh nhận báo cáo</div>
          <div className="nt-channel-row">
            <span className="nt-channel-icon">
              <MessageCircle size={20} aria-hidden />
            </span>
            <div>
              <strong>Bot Zalo</strong>
              <p>
                {data.zaloReady
                  ? "Đã kết nối người nhận với Bot"
                  : "Chưa kết nối người nhận với Bot"}
              </p>
              {!data.zaloReady && (
                <Link href="/quan-tri/zalo">
                  Kết nối Bot <ArrowUpRight size={13} aria-hidden />
                </Link>
              )}
            </div>
            <NotificationSwitch
              label="Gửi qua Zalo"
              checked={draft.zalo}
              onChange={(value) => update("zalo", value)}
            />
          </div>
          <div className="nt-channel-row">
            <span className="nt-channel-icon">
              <Mail size={20} aria-hidden />
            </span>
            <div>
              <strong>Email quản trị</strong>
              <p>Gửi đến các địa chỉ đang bật bên dưới.</p>
            </div>
            <NotificationSwitch
              label="Gửi qua email admin"
              checked={draft.email}
              onChange={(value) => update("email", value)}
            />
          </div>
          {draft.enabled && !draft.email && !draft.zalo && (
            <p className="nt-hint nt-hint--warn">
              Chưa bật kênh nhận. Báo cáo sẽ chưa được gửi qua Zalo hoặc email.
            </p>
          )}
        </fieldset>
        <footer className="nt-save-bar">
          <span>{dirty ? "Có thay đổi chưa lưu" : "Lịch đang được áp dụng"}</span>
          <button
            className="nt-button"
            disabled={!dirty || !valid || change.isPending}
            type="submit"
          >
            <Save size={16} aria-hidden />
            {change.isPending ? "Đang lưu…" : "Lưu lịch báo cáo"}
          </button>
        </footer>
        {notice && (
          <p
            className={`nt-notice ${failed ? "nt-notice--error" : ""}`}
            role={failed ? "alert" : "status"}
          >
            {notice}
          </p>
        )}
      </form>
      <aside className="nt-preview">
        <section className="nt-card nt-preview-card">
          <span className="nt-eyebrow">LỊCH CỦA BẠN</span>
          <span className="nt-preview-icon">
            <Clock3 size={27} aria-hidden />
          </span>
          <h2>{draft.enabled ? schedule : "Tạm dừng báo cáo"}</h2>
          <p>
            {draft.enabled
              ? "Chỉ báo cáo hội thoại có tin mới. Không gửi lặp những hội thoại yên lặng."
              : "Bật lại báo cáo để tiếp tục tổng hợp theo lịch."}
          </p>
          <div className="nt-preview-channels">
            {draft.zalo && (
              <span>
                <MessageCircle size={14} aria-hidden />
                Zalo
              </span>
            )}
            {draft.email && (
              <span>
                <Mail size={14} aria-hidden />
                Email
              </span>
            )}
          </div>
          <div className="nt-next">
            <span>Lần báo theo lịch đã lưu</span>
            <strong>
              {data.enabled && data.nextAt
                ? notificationDate(data.nextAt)
                : "Chưa có lịch đang chạy"}
            </strong>
            <small>Giờ Việt Nam</small>
          </div>
          {dirty && <p className="nt-preview-dirty">Lịch mới có hiệu lực sau khi bạn lưu.</p>}
        </section>
        <section className="nt-card nt-explanation">
          <ShieldCheck size={20} aria-hidden />
          <h3>Đúng thông tin. Đúng lúc.</h3>
          <p>
            Đặt lịch mới được báo ngay. Báo cáo chat gồm tên khách, KTV và số tin mới; không kèm nội
            dung cuộc trò chuyện.
          </p>
          <p>
            {draft.mode === "interval"
              ? "Khoảng giờ tính từ lúc lưu hoặc chạy báo cáo thủ công."
              : "Báo cáo được chạy theo giờ Việt Nam bạn đã chọn."}
          </p>
          <Link href="/quan-tri/zalo">
            Kiểm tra và gửi báo cáo ngay <ArrowUpRight size={14} aria-hidden />
          </Link>
        </section>
      </aside>
    </div>
  );
}

function RecipientManager({
  data,
  pending,
  error,
  refetch,
}: {
  data: Recipient[];
  pending: boolean;
  error: boolean;
  refetch: () => Promise<unknown>;
}) {
  const mutation = usePrivateMutation();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const normalized = email.trim().toLowerCase();
  const existing = data.find((row) => row.email.toLowerCase() === normalized);
  async function save(address: string, enabled: boolean, add = false) {
    if (add && existing?.enabled) {
      setFailed(true);
      setNotice("Email này đã có trong danh sách đang nhận thông báo.");
      return;
    }
    try {
      await mutation.mutateAsync({
        path: "/admin/notification-emails",
        body: { email: address, enabled },
      });
      await refetch();
      if (add) setEmail("");
      setFailed(false);
      setNotice(
        enabled ? "Đã bật nhận thông báo qua email." : "Đã tạm ngưng nhận thông báo qua email.",
      );
    } catch (error) {
      setFailed(true);
      setNotice(mutationMessage(error));
    }
  }
  async function remove(address: string) {
    try {
      await mutation.mutateAsync({
        path: `/admin/notification-emails/${encodeURIComponent(address)}`,
        method: "DELETE",
      });
      await refetch();
      setConfirming(null);
      setFailed(false);
      setNotice("Đã xóa địa chỉ nhận thông báo.");
    } catch (error) {
      setFailed(true);
      setNotice(mutationMessage(error));
    }
  }
  return (
    <section className="nt-card nt-recipients" id="nt-email-recipients">
      <header className="nt-card-heading">
        <div className="nt-heading-icon">
          <Mail size={22} aria-hidden />
        </div>
        <div>
          <span className="nt-eyebrow">NGƯỜI NHẬN</span>
          <h2>Email quản trị</h2>
          <p>Nhận yêu cầu đặt lịch mới và báo cáo chat theo lịch đã lưu.</p>
        </div>
        <span className="nt-count">{data.filter((item) => item.enabled).length} đang nhận</span>
      </header>
      {pending && (
        <p role="status" className="nt-hint">
          Đang tải danh sách người nhận…
        </p>
      )}
      {error && (
        <div role="alert" className="nt-notice nt-notice--error">
          Không tải được danh sách email.{" "}
          <button type="button" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      )}
      {!pending && !error && !data.length && (
        <div className="nt-empty">
          <Mail size={25} aria-hidden />
          <strong>Chưa có email nhận thông báo</strong>
          <p>Thêm địa chỉ của người phụ trách để bắt đầu nhận thông báo.</p>
        </div>
      )}
      <div className="nt-recipient-list">
        {data.map((item) => (
          <div className="nt-recipient" key={item.email}>
            <span className="nt-recipient-avatar">
              <Mail size={18} aria-hidden />
            </span>
            <div className="nt-recipient-identity">
              <strong>{item.email}</strong>
              <span>{item.enabled ? "Đang nhận thông báo" : "Đã tạm ngưng"}</span>
            </div>
            <div className="nt-recipient-actions">
              <NotificationSwitch
                label={`Nhận thông báo tại ${item.email}`}
                checked={item.enabled}
                disabled={mutation.isPending}
                onChange={(enabled) => void save(item.email, enabled)}
              />
              <button
                type="button"
                className="nt-icon-button nt-delete"
                aria-label={`Xóa ${item.email}`}
                disabled={mutation.isPending}
                onClick={() => setConfirming(item.email)}
              >
                <Trash2 size={17} aria-hidden />
              </button>
            </div>
            {confirming === item.email && (
              <div className="nt-delete-confirm">
                <p>Xóa địa chỉ này khỏi danh sách nhận thông báo?</p>
                <button
                  type="button"
                  className="nt-button nt-button--quiet"
                  onClick={() => setConfirming(null)}
                >
                  Giữ lại
                </button>
                <button
                  type="button"
                  className="nt-button nt-button--danger"
                  disabled={mutation.isPending}
                  onClick={() => void remove(item.email)}
                >
                  Xóa địa chỉ
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form
        className="nt-add-email"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void save(normalized, true, true);
        }}
      >
        <div className="nt-field">
          <label htmlFor="nt-new-email">Thêm email nhận thông báo</label>
          <input
            id="nt-new-email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setNotice("");
            }}
            placeholder="Nhập địa chỉ email"
          />
        </div>
        <button
          type="submit"
          className="nt-button"
          disabled={pending || error || mutation.isPending || !normalized}
        >
          <Plus size={16} aria-hidden />
          {existing && !existing.enabled ? "Bật nhận lại" : "Thêm email"}
        </button>
      </form>
      {notice && (
        <p
          className={`nt-notice ${failed ? "nt-notice--error" : ""}`}
          role={failed ? "alert" : "status"}
        >
          {notice}
        </p>
      )}
      <p className="nt-sender">
        <ShieldCheck size={15} aria-hidden />
        Thư được gửi từ Mộc Maria · <strong>no-reply@mocmaria.com</strong>
      </p>
    </section>
  );
}

export function NotificationCenter() {
  const digest = usePrivateData<ChatDigest>("/admin/chat-digest");
  const recipients = usePrivateData<Recipient[]>("/admin/notification-emails");
  const zalo = usePrivateData<ZaloStatus>("/admin/zalo-bot");
  async function refresh() {
    await Promise.all([digest.refetch(), recipients.refetch(), zalo.refetch()]);
  }
  return (
    <div className="mm-notifications">
      <div className="nt-toolbar">
        <NotificationNav active="schedule" />
        <button
          type="button"
          className="nt-button nt-button--quiet nt-refresh"
          disabled={digest.isFetching || recipients.isFetching || zalo.isFetching}
          onClick={() => void refresh()}
        >
          <RefreshCw size={15} aria-hidden />
          Làm mới trạng thái
        </button>
      </div>
      <div className="nt-status-grid">
        <section className="nt-status-card">
          <span className="nt-status-icon">
            <MessageCircle size={21} aria-hidden />
          </span>
          <div>
            <span>Bot Zalo</span>
            <strong>
              {digest.data
                ? digest.data.zaloReady
                  ? "Đã kết nối"
                  : "Cần kết nối"
                : "Đang kiểm tra…"}
            </strong>
            <small>
              {zalo.data
                ? `${zalo.data.recipientCount} người / nhóm nhận`
                : "Nhận yêu cầu hẹn và báo cáo chat"}
            </small>
          </div>
          <Link href="/quan-tri/zalo" aria-label="Quản lý Bot Zalo">
            <ArrowUpRight size={19} aria-hidden />
          </Link>
        </section>
        <section className="nt-status-card">
          <span className="nt-status-icon">
            <Mail size={21} aria-hidden />
          </span>
          <div>
            <span>Email quản trị</span>
            <strong>
              {recipients.data
                ? `${recipients.data.filter((item) => item.enabled).length} địa chỉ đang nhận`
                : "Đang kiểm tra…"}
            </strong>
            <small>
              {digest.data?.emailReady ? "Kênh gửi đã sẵn sàng" : "Thêm người nhận để nhận email"}
            </small>
          </div>
        </section>
        <section className="nt-status-card">
          <span className="nt-status-icon">
            <ShieldCheck size={21} aria-hidden />
          </span>
          <div>
            <span>Trạng thái gửi</span>
            <strong>
              {digest.data
                ? digest.data.failed
                  ? `${digest.data.failed} thông báo cần kiểm tra`
                  : "Không có lỗi gửi"
                : "Đang kiểm tra…"}
            </strong>
            <small>
              {digest.data
                ? `${digest.data.pending} thông báo đang chờ`
                : "Theo dõi Zalo và báo cáo email"}
            </small>
          </div>
          {digest.data && (
            <NotificationBadge tone={digest.data.failed ? "warn" : "good"}>
              {digest.data.failed ? "Cần xem lại" : "Ổn định"}
            </NotificationBadge>
          )}
        </section>
      </div>
      {digest.isPending && (
        <section className="nt-card nt-loading" role="status">
          Đang tải cấu hình báo cáo…
        </section>
      )}
      {digest.isError && (
        <section className="nt-card nt-notice nt-notice--error" role="alert">
          Không tải được lịch báo cáo.{" "}
          <button type="button" onClick={() => void digest.refetch()}>
            Thử lại
          </button>
        </section>
      )}
      {digest.data && <DigestEditor data={digest.data} refetch={digest.refetch} />}
      <RecipientManager
        data={recipients.data ?? []}
        pending={recipients.isPending}
        error={recipients.isError}
        refetch={recipients.refetch}
      />
    </div>
  );
}
