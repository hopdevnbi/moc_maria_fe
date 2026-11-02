"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  LoaderCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";
import type { GiftEvent } from "./event-admin";
import "./gift-players-admin.css";

type Person = {
  id?: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  tier?: string;
};
type Prize = {
  name?: string;
  title?: string;
  prizeName?: string;
  voucherCode?: string;
  code?: string;
  status?: string;
  discountPercent?: number;
};
export type GiftPlayRow = {
  id?: string;
  openId?: string;
  userId?: string;
  customerId?: string;
  customerUserId?: string;
  user?: Person | null;
  customer?: Person | null;
  customerName?: string;
  userName?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  openedAt?: string | null;
  playedAt?: string | null;
  active?: boolean;
  createdAt?: string | null;
  resetAt?: string | null;
  reset_at?: string | null;
  status?: string;
  rewardStatus?: string;
  prizeName?: string;
  discountPercent?: number;
  voucherCode?: string;
  prize?: Prize | null;
  reward?: Prize | null;
  voucher?: Prize | null;
};
export type GiftResetRow = {
  id: string;
  userId?: string;
  customerUserId?: string;
  playId?: string;
  openId?: string;
  user?: Person | null;
  customer?: Person | null;
  customerName?: string;
  operator?: Person | null;
  admin?: Person | null;
  actor?: Person | null;
  operatorName?: string;
  adminName?: string;
  actorName?: string;
  operatorId?: string;
  actorUserId?: string;
  reason: string;
  createdAt?: string | null;
  resetAt?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};
type PageResult<T> =
  | T[]
  | {
      items?: T[];
      rows?: T[];
      data?: T[] | { items?: T[]; total?: number };
      total?: number;
      count?: number;
      pagination?: { total?: number };
    };
function unpack<T>(value: PageResult<T> | undefined) {
  if (!value) return { rows: [] as T[], total: 0 };
  if (Array.isArray(value)) return { rows: value, total: value.length };
  const nested = value.data && !Array.isArray(value.data) ? value.data : null;
  const rows =
    value.items ?? value.rows ?? (Array.isArray(value.data) ? value.data : nested?.items) ?? [];
  return {
    rows,
    total: value.total ?? value.count ?? value.pagination?.total ?? nested?.total ?? rows.length,
  };
}
function dateTime(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    : "Chưa có thông tin";
}
function name(person?: Person | null, fallback?: string) {
  return person?.displayName || person?.fullName || person?.name || fallback || "Khách hàng";
}
function playPerson(play: GiftPlayRow) {
  return play.user || play.customer || null;
}
function playUserId(play: GiftPlayRow) {
  return (
    play.userId ||
    play.customerUserId ||
    play.customerId ||
    play.user?.id ||
    play.customer?.id ||
    ""
  );
}
function prizeName(play: GiftPlayRow) {
  const prize = play.prize || play.reward;
  const discount = play.discountPercent ?? prize?.discountPercent;
  return (
    play.prizeName ||
    prize?.name ||
    prize?.title ||
    prize?.prizeName ||
    (discount != null ? "Voucher giảm " + discount + "%" : "Chưa rõ phần quà")
  );
}
function status(play: GiftPlayRow) {
  if (play.resetAt || play.reset_at) return { text: "Đã reset lượt", kind: "muted" };
  const value = (
    play.rewardStatus ||
    play.voucher?.status ||
    play.reward?.status ||
    play.status ||
    ""
  ).toUpperCase();
  if (["REDEEMED", "USED"].includes(value)) return { text: "Đã sử dụng", kind: "used" };
  if (["VOIDED", "CANCELLED", "CANCELED", "EXPIRED"].includes(value))
    return { text: "Đã vô hiệu", kind: "muted" };
  return { text: "Đã mở quà", kind: "active" };
}

const PAGE_SIZE = 15;
export function GiftPlayersAdmin() {
  const { user } = useAuth();
  const superAdmin = !!user?.roles.includes("SUPER_ADMIN");
  const events = usePrivateData<GiftEvent[]>("/admin/gift-events", superAdmin);
  const mutation = usePrivateMutation();
  const [selectedId, setSelectedId] = useState("");
  const [section, setSection] = useState<"players" | "resets">("players");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [target, setTarget] = useState<GiftPlayRow | null>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(input.trim()), 350);
    return () => window.clearTimeout(handle);
  }, [input]);

  const eventId = events.data?.some((event) => event.id === selectedId)
    ? selectedId
    : events.data?.find((event) => event.effectiveStatus === "LIVE")?.id ||
      events.data?.[0]?.id ||
      "";
  const base = eventId ? "/admin/gift-events/" + encodeURIComponent(eventId) : "";
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (search) params.set("search", search);
  const plays = usePrivateData<PageResult<GiftPlayRow>>(
    base + "/plays?" + params.toString(),
    superAdmin && !!base && section === "players",
  );
  const resets = usePrivateData<PageResult<GiftResetRow>>(
    base + "/play-resets?" + params.toString(),
    superAdmin && !!base && section === "resets",
  );
  const playerPage = unpack(plays.data);
  const resetPage = unpack(resets.data);
  const active = section === "players" ? plays : resets;
  const total = section === "players" ? playerPage.total : resetPage.total;
  const setEvent = (value: string) => {
    setSelectedId(value);
    setOffset(0);
    setFeedback("");
    setError("");
    setTarget(null);
  };
  const setView = (value: "players" | "resets") => {
    setSection(value);
    setOffset(0);
    setError("");
  };
  const setQuery = (value: string) => {
    setInput(value);
    setOffset(0);
  };
  function openReset(play: GiftPlayRow) {
    setTarget(play);
    setReason("");
    setError("");
    setFeedback("");
  }
  function closeReset() {
    if (!mutation.isPending) setTarget(null);
  }
  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = target && playUserId(target);
    if (!base || !userId || reason.trim().length < 3 || mutation.isPending) return;
    setError("");
    try {
      await mutation.mutateAsync({
        path: base + "/plays/" + encodeURIComponent(userId) + "/reset",
        body: { reason: reason.trim() },
      });
      setTarget(null);
      setReason("");
      setFeedback("Đã reset lượt mở quà. Toàn bộ thao tác được lưu trong lịch sử reset.");
      void plays.refetch();
      void resets.refetch();
    } catch (caught) {
      setError(mutationMessage(caught));
    }
  }
  if (!superAdmin)
    return (
      <div className="mm-gp-state">
        <ShieldAlert /> Chỉ Super Admin có quyền tra cứu và reset lượt mở quà.
      </div>
    );
  return (
    <div className="mm-gp">
      <header className="mm-gp-heading">
        <div>
          <span className="mm-gp-overline">
            <Users size={15} /> QUẢN LÝ NGƯỜI THAM GIA
          </span>
          <h3>Lượt mở quà & lịch sử reset</h3>
          <p>Tìm khách đã mở quà, hỗ trợ kiểm thử và kiểm tra dấu vết thao tác của Super Admin.</p>
        </div>
        <div className="mm-gp-event-select">
          <label htmlFor="mm-gp-event">Chiến dịch</label>
          <select
            id="mm-gp-event"
            value={eventId}
            onChange={(event) => setEvent(event.target.value)}
            disabled={!events.data?.length}
          >
            {!events.data?.length && <option value="">Chưa có chiến dịch</option>}
            {events.data?.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} - {event.code}
              </option>
            ))}
          </select>
        </div>
      </header>
      {feedback && (
        <div role="status" className="mm-gp-message success">
          <CheckCircle2 size={17} /> {feedback}
        </div>
      )}
      {events.isError && (
        <div role="alert" className="mm-gp-message error">
          Không tải được danh sách chiến dịch.
        </div>
      )}
      <div className="mm-gp-toolbar">
        <div className="mm-gp-switch" aria-label="Mục quản lý">
          <button
            type="button"
            onClick={() => setView("players")}
            className={section === "players" ? "selected" : ""}
            aria-pressed={section === "players"}
          >
            <Users size={16} /> Người đã mở quà
          </button>
          <button
            type="button"
            onClick={() => setView("resets")}
            className={section === "resets" ? "selected" : ""}
            aria-pressed={section === "resets"}
          >
            <History size={16} /> Lịch sử reset
          </button>
        </div>
        <div className="mm-gp-search">
          <Search size={17} />
          <input
            value={input}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Tìm theo tên, số điện thoại hoặc email"
            placeholder="Tên, điện thoại, email..."
          />
          {input && (
            <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="mm-gp-list-head">
        <div>
          <strong>{active.isLoading ? "..." : total.toLocaleString("vi-VN")}</strong>
          <span>{section === "players" ? "lượt mở quà" : "lần reset đã ghi nhận"}</span>
          {search && <small>Đang tìm: “{search}”</small>}
        </div>
        <button
          type="button"
          disabled={active.isFetching || !base}
          onClick={() => void active.refetch()}
        >
          <RefreshCcw size={15} /> Làm mới
        </button>
      </div>
      {!base ? (
        <div className="mm-gp-state">
          <Users size={25} /> Chọn hoặc tạo chiến dịch để xem dữ liệu.
        </div>
      ) : active.isLoading ? (
        <div className="mm-gp-state">
          <LoaderCircle className="mm-gp-spin" size={24} /> Đang tải dữ liệu...
        </div>
      ) : active.isError ? (
        <div className="mm-gp-state error">
          <ShieldAlert size={24} /> Không thể tải dữ liệu.
          <button type="button" onClick={() => void active.refetch()}>
            Thử lại
          </button>
        </div>
      ) : section === "players" ? (
        !playerPage.rows.length ? (
          <div className="mm-gp-state">
            <Users size={25} /> Chưa có lượt mở quà phù hợp.
          </div>
        ) : (
          <div className="mm-gp-table-wrap">
            <table className="mm-gp-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Phần quà / voucher</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {playerPage.rows.map((play) => {
                  const person = playPerson(play);
                  const id = playUserId(play);
                  const state = status(play);
                  const voucher =
                    play.voucherCode ||
                    play.voucher?.voucherCode ||
                    play.voucher?.code ||
                    play.reward?.voucherCode;
                  return (
                    <tr key={play.openId || play.id}>
                      <td>
                        <strong>
                          {name(person, play.displayName || play.customerName || play.userName)}
                        </strong>
                        <small>
                          {person?.phone ||
                            person?.phoneNumber ||
                            play.phone ||
                            person?.email ||
                            play.email ||
                            (id ? "ID: " + id : "Chưa có liên hệ")}
                        </small>
                        {person?.tier && <em>{person.tier}</em>}
                      </td>
                      <td>
                        <strong className="mm-gp-prize">
                          <TicketPercent size={15} /> {prizeName(play)}
                        </strong>
                        {voucher && <small className="mm-gp-code">Mã: {voucher}</small>}
                      </td>
                      <td>
                        <span className="mm-gp-date">
                          <Clock3 size={14} />{" "}
                          {dateTime(play.playedAt || play.openedAt || play.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span className={"mm-gp-status " + state.kind}>{state.text}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="mm-gp-reset"
                          onClick={() => openReset(play)}
                          disabled={!id || !!(play.resetAt || play.reset_at)}
                        >
                          <RefreshCcw size={15} /> Reset lượt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : !resetPage.rows.length ? (
        <div className="mm-gp-state">
          <History size={25} /> Chưa có lịch sử reset phù hợp.
        </div>
      ) : (
        <div className="mm-gp-table-wrap">
          <table className="mm-gp-table">
            <thead>
              <tr>
                <th>Khách được reset</th>
                <th>Người thực hiện</th>
                <th>Thời gian</th>
                <th>Lý do / nhật ký</th>
              </tr>
            </thead>
            <tbody>
              {resetPage.rows.map((entry) => {
                const operator = entry.operator || entry.admin || entry.actor;
                return (
                  <tr key={entry.id}>
                    <td>
                      <strong>
                        {name(
                          entry.user || entry.customer,
                          entry.customerName || entry.customerUserId || entry.userId,
                        )}
                      </strong>
                      <small>ID lượt: {entry.openId || entry.playId || "-"}</small>
                    </td>
                    <td>
                      <strong>
                        {name(
                          operator,
                          entry.actorName ||
                            entry.operatorName ||
                            entry.adminName ||
                            entry.actorUserId ||
                            entry.operatorId,
                        )}
                      </strong>
                      {(entry.actorUserId || entry.operatorId) && (
                        <small>ID: {entry.actorUserId || entry.operatorId}</small>
                      )}
                    </td>
                    <td>
                      <span className="mm-gp-date">
                        <Clock3 size={14} /> {dateTime(entry.createdAt || entry.resetAt)}
                      </span>
                    </td>
                    <td>
                      <span className="mm-gp-reason">{entry.reason || "Không có lý do"}</span>
                      {(entry.before || entry.after) && (
                        <details className="mm-gp-audit">
                          <summary>Xem dữ liệu trước / sau</summary>
                          {entry.before && (
                            <div>
                              <b>Trước: </b>
                              <code>{JSON.stringify(entry.before)}</code>
                            </div>
                          )}
                          {entry.after && (
                            <div>
                              <b>Sau: </b>
                              <code>{JSON.stringify(entry.after)}</code>
                            </div>
                          )}
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {base && !active.isLoading && !active.isError && total > 0 && (
        <nav className="mm-gp-pagination" aria-label="Phân trang">
          <span>
            Hiển thị {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} /{" "}
            {total.toLocaleString("vi-VN")}
          </span>
          <div>
            <button
              type="button"
              disabled={offset === 0 || active.isFetching}
              onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
            >
              Trước
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total || active.isFetching}
              onClick={() => setOffset((value) => value + PAGE_SIZE)}
            >
              Tiếp <ArrowRight size={14} />
            </button>
          </div>
        </nav>
      )}
      {target && (
        <div
          className="mm-gp-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReset();
          }}
        >
          <div
            className="mm-gp-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-gp-dialog-title"
          >
            <button
              type="button"
              className="mm-gp-close"
              aria-label="Đóng"
              onClick={closeReset}
              disabled={mutation.isPending}
            >
              <X size={19} />
            </button>
            <div className="mm-gp-dialog-icon">
              <RefreshCcw size={24} />
            </div>
            <h4 id="mm-gp-dialog-title">Xác nhận reset lượt mở quà</h4>
            <p>
              Khôi phục lượt mở quà cho{" "}
              <strong>
                {name(
                  playPerson(target),
                  target.displayName || target.customerName || target.userName,
                )}
              </strong>{" "}
              tại chiến dịch này.
            </p>
            <div className="mm-gp-reset-info">
              <strong>Quà đã mở: {prizeName(target)}</strong>
              <span>Thao tác được ghi lịch sử để đối soát. Quà đã sử dụng không bị thu hồi.</span>
            </div>
            <form onSubmit={submitReset}>
              <label htmlFor="mm-gp-reason">
                Lý do reset <span>*</span>
              </label>
              <textarea
                id="mm-gp-reason"
                rows={3}
                required
                maxLength={500}
                autoFocus
                placeholder="Ví dụ: Kiểm thử lại thao tác mở quà"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={mutation.isPending}
              />
              {error && (
                <div role="alert" className="mm-gp-message error">
                  {error}
                </div>
              )}
              <div className="mm-gp-dialog-actions">
                <button type="button" onClick={closeReset} disabled={mutation.isPending}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={reason.trim().length < 3 || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <LoaderCircle size={16} className="mm-gp-spin" />
                  ) : (
                    <RefreshCcw size={16} />
                  )}{" "}
                  Xác nhận reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
