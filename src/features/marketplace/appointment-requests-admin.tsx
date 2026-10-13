"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Home,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { mutationMessage, usePrivateData, usePrivateMutation } from "./private-api";
import "./appointment-requests-admin.css";

export type RequestStatus = "PENDING" | "CONTACTED" | "DECLINED" | "CANCELLED";
export interface AdminAppointmentRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  providerId: string;
  providerName: string;
  serviceName: string;
  requestedAt: string;
  createdAt: string;
  updatedAt?: string;
  location: "AT_HOME" | "AT_BRANCH";
  address: string;
  notes: string;
  status: RequestStatus;
  allowedActions?: Array<"CONTACTED" | "DECLINED">;
}

interface RequestDetail extends AdminAppointmentRequest {
  history: Array<{
    event: string;
    status: RequestStatus | null;
    reason: string | null;
    createdAt: string;
  }>;
}

interface RequestList {
  items: AdminAppointmentRequest[];
  total: number;
  page: number;
  hasMore: boolean;
  counts: Record<RequestStatus | "ALL", number>;
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: "Chờ KTV phản hồi",
  CONTACTED: "Đang trao đổi",
  DECLINED: "Không thể phục vụ",
  CANCELLED: "Đã hủy",
};

const filters: { value: RequestStatus | "ALL"; title: string }[] = [
  { value: "ALL", title: "Tất cả" },
  { value: "PENDING", title: "Chờ phản hồi" },
  { value: "CONTACTED", title: "Đang trao đổi" },
  { value: "DECLINED", title: "Từ chối" },
  { value: "CANCELLED", title: "Đã hủy" },
];

export function formatRequestDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const actionLabels: Partial<Record<RequestStatus, string>> = {
  CONTACTED: "Đánh dấu đã liên hệ",
  DECLINED: "Không thể tiếp nhận",
  CANCELLED: "Hủy yêu cầu",
};

export function AppointmentRequestsAdmin() {
  const [filter, setFilter] = useState<RequestStatus | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [action, setAction] = useState<RequestStatus | null>(null);
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const endpoint = `/admin/appointment-inquiries?page=${page}${filter !== "ALL" ? `&status=${filter}` : ""}&q=${encodeURIComponent(query)}`;
  const requests = usePrivateData<RequestList>(endpoint);
  const change = usePrivateMutation();
  const entries = requests.data?.items ?? [];
  const selected = entries.find((item) => item.id === selectedId) ?? entries[0] ?? null;
  const detail = usePrivateData<RequestDetail>(
    selected ? `/admin/appointment-inquiries/${encodeURIComponent(selected.id)}` : "",
    !!selected,
  );
  const total = requests.data?.total ?? 0;

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !action || reason.trim().length < 10 || change.isPending) return;
    try {
      await change.mutateAsync({
        path: `/admin/appointment-inquiries/${encodeURIComponent(selected.id)}`,
        method: "PATCH",
        body: { status: action, reason: reason.trim() },
      });
      setAction(null);
      setReason("");
      setSuccess("Đã lưu kết quả xử lý yêu cầu. Danh sách đã được cập nhật.");
      await requests.refetch();
    } catch {
      // The mutation error stays visible in the confirmation dialog.
    }
  }

  return (
    <div className="mm-request-admin">
      <section className="mm-request-intro">
        <span className="mm-request-intro-icon">
          <CalendarClock size={24} />
        </span>
        <div>
          <span className="mm-request-overline">TRUNG TÂM TIẾP NHẬN</span>
          <h2>Chăm sóc từng yêu cầu từ khách hàng</h2>
          <p>
            Tra cứu yêu cầu, kiểm tra lịch mong muốn và phối hợp kỹ thuật viên. Yêu cầu tư vấn chỉ
            là bước liên hệ, <strong>chưa phải lịch hẹn đã được xác nhận hoặc thanh toán.</strong>
          </p>
        </div>
      </section>

      <section className="mm-request-summary" aria-label="Thống kê yêu cầu">
        {[
          { value: "ALL" as const, title: "Tổng yêu cầu", icon: CalendarClock },
          { value: "PENDING" as const, title: "Chờ phản hồi", icon: Clock3 },
          { value: "CONTACTED" as const, title: "Đang trao đổi", icon: UserRound },
          { value: "DECLINED" as const, title: "Không thể tiếp nhận", icon: AlertCircle },
        ].map(({ value, title, icon: Icon }) => (
          <button
            className={filter === value ? "mm-request-stat is-active" : "mm-request-stat"}
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
              setSuccess("");
            }}
          >
            <span>
              <Icon size={18} />
              {title}
            </span>
            <strong>{requests.data?.counts?.[value] ?? "—"}</strong>
          </button>
        ))}
      </section>

      <section className="mm-request-board" aria-label="Danh sách yêu cầu đặt lịch">
        <header className="mm-request-toolbar">
          <div>
            <span className="mm-request-overline">DANH SÁCH TIẾP NHẬN</span>
            <h3>
              Yêu cầu của khách <small>{requests.data ? `${total} kết quả` : ""}</small>
            </h3>
          </div>
          <button
            type="button"
            className="mm-request-reload"
            onClick={() => void requests.refetch()}
            disabled={requests.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />{" "}
            {requests.isFetching ? "Đang tải..." : "Làm mới"}
          </button>
        </header>

        <div className="mm-request-search-box">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Tìm theo khách hàng, kỹ thuật viên hoặc dịch vụ"
            placeholder="Tìm tên khách, KTV, dịch vụ hoặc mã yêu cầu..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={120}
          />
          {search && (
            <button type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => setSearch("")}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mm-request-filters" role="group" aria-label="Lọc trạng thái yêu cầu">
          {filters.map((entry) => (
            <button
              type="button"
              key={entry.value}
              aria-pressed={filter === entry.value}
              className={filter === entry.value ? "is-active" : ""}
              onClick={() => {
                setFilter(entry.value);
                setPage(1);
                setSelectedId("");
                setSuccess("");
              }}
            >
              {entry.title}
            </button>
          ))}
        </div>

        {success && (
          <p className="mm-request-flash" role="status">
            <Check size={16} /> {success}
          </p>
        )}
        {requests.isPending ? (
          <p className="mm-request-placeholder" role="status">
            Đang tải yêu cầu đặt lịch...
          </p>
        ) : requests.isError || !requests.data ? (
          <p className="mm-request-placeholder" role="alert">
            Không tải được yêu cầu. Vui lòng kiểm tra kết nối hoặc quyền truy cập rồi thử lại.
          </p>
        ) : !entries.length ? (
          <div className="mm-request-placeholder">
            <CalendarClock size={32} strokeWidth={1.5} />
            <strong>Chưa có yêu cầu nào phù hợp</strong>
            <p>Thử chọn trạng thái khác hoặc thay đổi từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="mm-request-content">
            <div className="mm-request-list" aria-label="Các yêu cầu">
              {entries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={"mm-request-row" + (selected?.id === item.id ? " is-selected" : "")}
                  onClick={() => {
                    setSelectedId(item.id);
                    setAction(null);
                    setSuccess("");
                  }}
                  aria-pressed={selected?.id === item.id}
                >
                  <span className="mm-request-row-top">
                    <strong>{item.customerName}</strong>
                    <span className={`mm-request-status is-${item.status.toLowerCase()}`}>
                      {requestStatusLabels[item.status] || item.status}
                    </span>
                  </span>
                  <span className="mm-request-row-service">{item.serviceName}</span>
                  <span className="mm-request-row-meta">
                    <Clock3 size={14} /> {formatRequestDate(item.requestedAt)} · {item.providerName}
                  </span>
                  <span className="mm-request-row-meta">
                    {item.location === "AT_HOME" ? <Home size={14} /> : <MapPin size={14} />}{" "}
                    {item.location === "AT_HOME" ? "Phục vụ tại nhà" : "Tại cơ sở"}
                  </span>
                </button>
              ))}
            </div>
            {selected && (
              <article
                className="mm-request-detail"
                aria-label="Chi tiết yêu cầu được chọn"
                key={selected.id}
              >
                <div className="mm-request-detail-head">
                  <div>
                    <span className="mm-request-overline">THÔNG TIN YÊU CẦU</span>
                    <h4>{selected.customerName}</h4>
                  </div>
                  <span className={`mm-request-status is-${selected.status.toLowerCase()}`}>
                    {requestStatusLabels[selected.status] || selected.status}
                  </span>
                </div>
                <dl className="mm-request-facts">
                  <div>
                    <dt>Dịch vụ</dt>
                    <dd>{selected.serviceName}</dd>
                  </div>
                  <div>
                    <dt>Kỹ thuật viên</dt>
                    <dd>{selected.providerName}</dd>
                  </div>
                  <div>
                    <dt>Giờ khách mong muốn</dt>
                    <dd>{formatRequestDate(selected.requestedAt)}</dd>
                  </div>
                  <div>
                    <dt>Hình thức</dt>
                    <dd>{selected.location === "AT_HOME" ? "Phục vụ tại nhà" : "Tại cơ sở"}</dd>
                  </div>
                  <div>
                    <dt>Địa chỉ</dt>
                    <dd className="mm-request-pre">{selected.address}</dd>
                  </div>
                  <div>
                    <dt>Gửi lúc</dt>
                    <dd>{formatRequestDate(selected.createdAt)}</dd>
                  </div>
                  {selected.customerEmail && (
                    <div>
                      <dt>Email khách</dt>
                      <dd>
                        <a href={`mailto:${selected.customerEmail}`}>{selected.customerEmail}</a>
                      </dd>
                    </div>
                  )}
                  {selected.customerPhone && (
                    <div>
                      <dt>Điện thoại</dt>
                      <dd>
                        <a href={`tel:${selected.customerPhone}`}>{selected.customerPhone}</a>
                      </dd>
                    </div>
                  )}
                </dl>
                {selected.notes && (
                  <div className="mm-request-note">
                    <span className="mm-request-overline">GHI CHÚ CỦA KHÁCH</span>
                    <p>{selected.notes}</p>
                  </div>
                )}
                <section className="mm-request-history" aria-label="Lịch sử xử lý yêu cầu">
                  <h5>Lịch sử xử lý</h5>
                  {detail.isPending ? (
                    <p role="status">Đang tải lịch sử...</p>
                  ) : detail.isError ? (
                    <p role="alert">Chưa xem được lịch sử xử lý. Hãy tải lại trang để thử lại.</p>
                  ) : !detail.data?.history?.length ? (
                    <p>Chưa ghi nhận thay đổi nào.</p>
                  ) : (
                    <ol>
                      {detail.data.history.map((event, index) => (
                        <li key={`${event.event}-${event.createdAt}-${index}`}>
                          <strong>
                            {event.event === "appointment.inquiry.created"
                              ? "Khách gửi yêu cầu"
                              : event.event === "appointment.inquiry.admin_updated"
                                ? "Quản trị cập nhật"
                                : "Yêu cầu được cập nhật"}
                            {event.status
                              ? ` · ${requestStatusLabels[event.status] || event.status}`
                              : ""}
                          </strong>
                          <time>{formatRequestDate(event.createdAt)}</time>
                          {event.reason && <p>{event.reason}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
                <div className="mm-request-id">
                  Mã yêu cầu: <span>{selected.id}</span>
                </div>
                <div className="mm-request-detail-foot">
                  <p>
                    Chỉ đánh dấu đã liên hệ sau khi thực sự trao đổi với khách hoặc KTV. Thao tác
                    không tự tạo lịch xác nhận.
                  </p>
                  {selected.allowedActions?.includes("CONTACTED") && (
                    <button
                      className="mm-request-action primary"
                      type="button"
                      onClick={() => {
                        setAction("CONTACTED");
                        setReason("");
                        change.reset();
                      }}
                    >
                      <Check size={16} /> Đã liên hệ
                    </button>
                  )}
                  {selected.allowedActions?.includes("DECLINED") && (
                    <button
                      className="mm-request-action subtle"
                      type="button"
                      onClick={() => {
                        setAction("DECLINED");
                        setReason("");
                        change.reset();
                      }}
                    >
                      <X size={16} /> Không thể tiếp nhận
                    </button>
                  )}
                </div>
              </article>
            )}
          </div>
        )}
        {requests.data && (page > 1 || requests.data.hasMore) && (
          <nav className="mm-request-pagination" aria-label="Phân trang yêu cầu">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((value) => Math.max(1, value - 1));
                setSelectedId("");
              }}
            >
              <ChevronLeft size={17} /> Trước
            </button>
            <span>Trang {page}</span>
            <button
              type="button"
              disabled={!requests.data.hasMore}
              onClick={() => {
                setPage((value) => value + 1);
                setSelectedId("");
              }}
            >
              Sau <ChevronRight size={17} />
            </button>
          </nav>
        )}
      </section>
      <p className="mm-request-security">
        <ExternalLink size={14} /> Thông tin khách hàng chỉ được hiển thị trong khu vực quản trị có
        phân quyền.
      </p>

      {selected && action && (
        <div className="mm-request-modal-layer" role="presentation">
          <form
            className="mm-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-request-modal-title"
            onSubmit={(event) => void submitAction(event)}
          >
            <h3 id="mm-request-modal-title">{actionLabels[action] || "Cập nhật yêu cầu"}</h3>
            <p>
              Khách hàng <strong>{selected.customerName}</strong> · {selected.serviceName}. Hành
              động này được ghi nhận trong lịch sử quản trị.
            </p>
            <label htmlFor="mm-request-reason">Ghi chú xử lý (ít nhất 10 ký tự)</label>
            <textarea
              id="mm-request-reason"
              value={reason}
              maxLength={500}
              rows={4}
              autoFocus
              onChange={(event) => setReason(event.target.value)}
              placeholder="Đã liên hệ qua điện thoại và thống nhất bước tư vấn tiếp theo..."
              required
              minLength={10}
            />
            {change.isError && (
              <p role="alert" className="mm-request-error">
                {mutationMessage(change.error)}
              </p>
            )}
            <div className="mm-request-modal-actions">
              <button type="button" onClick={() => setAction(null)} disabled={change.isPending}>
                Quay lại
              </button>
              <button
                type="submit"
                className="primary"
                disabled={change.isPending || reason.trim().length < 10}
              >
                {change.isPending ? "Đang lưu..." : "Xác nhận xử lý"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
