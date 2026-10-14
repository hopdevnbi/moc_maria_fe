"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileClock,
  HeartHandshake,
  Mail,
  NotebookPen,
  Phone,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData, usePrivateMutation } from "./private-api";
import "./customer-management-admin.css";

type Tier = "ALL" | "VIP" | "STANDARD";
type AccountStatus = "ALL" | "ACTIVE" | "INACTIVE";

interface Customer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  birthday: string | null;
  vipStatus: "VIP" | "STANDARD";
  vipExpiresAt: string | null;
  inquiryCount: number;
  appointmentCount: number;
  completedCount: number;
  lastContactAt: string | null;
}

interface CustomerPage {
  items: Customer[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  counts: { all: number; vip: number; standard: number; active: number };
}

interface CustomerDetail extends Customer {
  note: string;
  vip: {
    isVip: boolean;
    expiresAt: string | null;
    startedAt: string | null;
    reason: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  inquiries: Array<{
    id: string;
    serviceName: string | null;
    status: string | null;
    createdAt: string | null;
  }>;
  history: Array<{
    event: string;
    createdAt: string;
    actorUserId: string | null;
    reason: string | null;
  }>;
}

const shortDate = (value: string | null | undefined) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có"
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
};

const longDate = (value: string | null | undefined) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có"
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
};

function CustomerBadge({ customer }: { customer: Customer }) {
  return (
    <span className={customer.vipStatus === "VIP" ? "mm-cm-badge is-vip" : "mm-cm-badge"}>
      {customer.vipStatus === "VIP" && <Crown size={13} aria-hidden="true" />}
      {customer.vipStatus === "VIP" ? "VIP" : "Thường"}
    </span>
  );
}

function CustomerDetails({ customer, onClose }: { customer: CustomerDetail; onClose: () => void }) {
  const { user } = useAuth();
  const canManageAccounts = !!user?.permissions.includes("users.manage") && user.id !== customer.id;
  const noteMutation = usePrivateMutation<CustomerDetail>();
  const vipMutation = usePrivateMutation<CustomerDetail>();
  const accountMutation = usePrivateMutation<{ id: string; isActive: boolean }>();
  const [note, setNote] = useState(customer.note);
  const [reason, setReason] = useState("");
  const [expiry, setExpiry] = useState(
    customer.vipStatus === "VIP" && customer.vipExpiresAt ? customer.vipExpiresAt.slice(0, 10) : "",
  );
  const [grantVip, setGrantVip] = useState(customer.vipStatus !== "VIP");
  const [feedback, setFeedback] = useState("");
  const [confirmAccountChange, setConfirmAccountChange] = useState(false);

  const saveNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    try {
      await noteMutation.mutateAsync({
        path: `/admin/customers/${customer.id}/note`,
        method: "PATCH",
        body: { note },
      });
      setFeedback("Đã lưu ghi chú chăm sóc.");
    } catch {
      // The mutation error is rendered next to the form.
    }
  };

  const saveVip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    if (reason.trim().length < 10) return;
    try {
      const expiresAt = grantVip && expiry ? `${expiry}T23:59:59+07:00` : null;
      await vipMutation.mutateAsync({
        path: `/admin/customers/${customer.id}/vip`,
        method: "PATCH",
        body: { isVip: grantVip, expiresAt, reason: reason.trim() },
      });
      setFeedback(grantVip ? "Đã cập nhật trạng thái VIP." : "Đã thu hồi trạng thái VIP.");
    } catch {
      // The mutation error is rendered next to the form.
    }
  };

  const changeAccountStatus = async () => {
    if (!canManageAccounts) return;
    setFeedback("");
    try {
      await accountMutation.mutateAsync({
        path: `/admin/users/${customer.id}/status`,
        method: "PATCH",
        body: { isActive: !customer.isActive },
      });
      setConfirmAccountChange(false);
      setFeedback(
        customer.isActive ? "Đã tạm khóa tài khoản khách hàng." : "Đã mở lại tài khoản khách hàng.",
      );
    } catch {
      // Errors are surfaced next to the confirmation.
    }
  };

  return (
    <aside className="mm-cm-detail" aria-label={`Chi tiết khách hàng ${customer.displayName}`}>
      <div className="mm-cm-detail-heading">
        <span className="mm-cm-avatar" aria-hidden="true">
          {customer.displayName.trim().charAt(0).toLocaleUpperCase("vi-VN") || "K"}
        </span>
        <div>
          <p className="mm-cm-overline">HỒ SƠ KHÁCH HÀNG</p>
          <h3>{customer.displayName}</h3>
          <div className="mm-cm-badges">
            <CustomerBadge customer={customer} />
            <span className={customer.isActive ? "mm-cm-state" : "mm-cm-state is-off"}>
              {customer.isActive ? "Tài khoản hoạt động" : "Tài khoản tạm khóa"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="mm-cm-icon-button"
          aria-label="Đóng chi tiết"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="mm-cm-contact">
        <div>
          <Mail size={16} /> {customer.email || "Chưa có email"}
        </div>
        <div>
          <Phone size={16} /> {customer.phone || "Chưa có số điện thoại"}
        </div>
        <div>
          <CalendarDays size={16} /> Đăng ký {shortDate(customer.createdAt)}
        </div>
      </div>

      <div className="mm-cm-detail-stats">
        <div>
          <strong>{customer.inquiryCount}</strong>
          <span>Yêu cầu liên hệ</span>
        </div>
        <div>
          <strong>{customer.appointmentCount}</strong>
          <span>Lịch đặt</span>
        </div>
        <div>
          <strong>{customer.completedCount}</strong>
          <span>Lịch hoàn tất</span>
        </div>
      </div>

      {canManageAccounts && (
        <section className="mm-cm-detail-section">
          <div className="mm-cm-section-heading">
            <ShieldCheck size={19} />
            <h4>Trạng thái tài khoản</h4>
          </div>
          <p className="mm-cm-muted">
            {customer.isActive
              ? "Tài khoản đang hoạt động. Khi tạm khóa, các phiên đăng nhập của khách sẽ bị thu hồi."
              : "Tài khoản đã bị tạm khóa và khách không thể đăng nhập cho đến khi được mở lại."}
          </p>
          {!confirmAccountChange ? (
            <button
              type="button"
              className="mm-cm-account-button"
              onClick={() => setConfirmAccountChange(true)}
            >
              {customer.isActive ? "Tạm khóa tài khoản" : "Mở lại tài khoản"}
            </button>
          ) : (
            <div className="mm-cm-account-confirm">
              <p>
                {customer.isActive
                  ? "Xác nhận tạm khóa tài khoản của khách hàng này?"
                  : "Xác nhận cho phép khách hàng đăng nhập trở lại?"}
              </p>
              <div>
                <button
                  type="button"
                  className="mm-cm-primary"
                  disabled={accountMutation.isPending}
                  onClick={changeAccountStatus}
                >
                  {accountMutation.isPending ? "Đang cập nhật..." : "Xác nhận"}
                </button>
                <button
                  type="button"
                  disabled={accountMutation.isPending}
                  onClick={() => setConfirmAccountChange(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          {accountMutation.isError && (
            <p className="mm-cm-error" role="alert">
              {mutationMessage(accountMutation.error)}
            </p>
          )}
        </section>
      )}

      <section className="mm-cm-detail-section">
        <div className="mm-cm-section-heading">
          <Crown size={19} />
          <h4>Quản lý hội viên VIP</h4>
        </div>
        <div className="mm-cm-membership-note">
          <strong>
            {customer.vipStatus === "VIP" ? "Hội viên VIP đang hiệu lực" : "Khách hàng thường"}
          </strong>
          <span>
            {customer.vipStatus === "VIP"
              ? customer.vipExpiresAt
                ? `Hiệu lực đến ${longDate(customer.vipExpiresAt)}`
                : "Chưa đặt ngày hết hạn"
              : customer.vip.expiresAt
                ? `Lần cấp gần nhất hết hạn ${longDate(customer.vip.expiresAt)}`
                : "Chưa có hạng VIP đang hiệu lực"}
          </span>
        </div>
        <form className="mm-cm-form" onSubmit={saveVip}>
          <div className="mm-cm-choice" role="group" aria-label="Thay đổi hội viên VIP">
            <button
              type="button"
              className={grantVip ? "is-selected" : ""}
              onClick={() => setGrantVip(true)}
            >
              <Crown size={15} /> Cấp / gia hạn VIP
            </button>
            <button
              type="button"
              className={!grantVip ? "is-selected" : ""}
              onClick={() => setGrantVip(false)}
            >
              Đưa về thường
            </button>
          </div>
          {grantVip && (
            <label>
              Ngày hết hạn (tùy chọn)
              <input
                type="date"
                value={expiry}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setExpiry(event.target.value)}
              />
            </label>
          )}
          <label>
            Lý do thay đổi <span className="mm-cm-required">*</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              maxLength={500}
              required
              rows={3}
              placeholder="Ghi rõ căn cứ cấp, gia hạn hoặc thu hồi VIP (ít nhất 10 ký tự)"
            />
          </label>
          <p className="mm-cm-muted">
            Hạng VIP được duyệt thủ công, chưa tự áp dụng chiết khấu hay quyền lợi tài chính.
          </p>
          <button
            className="mm-cm-primary"
            type="submit"
            disabled={vipMutation.isPending || reason.trim().length < 10}
          >
            {vipMutation.isPending
              ? "Đang lưu..."
              : grantVip
                ? "Xác nhận cập nhật VIP"
                : "Xác nhận thu hồi VIP"}
          </button>
          {vipMutation.isError && (
            <p className="mm-cm-error" role="alert">
              {mutationMessage(vipMutation.error)}
            </p>
          )}
        </form>
      </section>

      <section className="mm-cm-detail-section">
        <div className="mm-cm-section-heading">
          <NotebookPen size={19} />
          <h4>Ghi chú chăm sóc nội bộ</h4>
        </div>
        <form className="mm-cm-form" onSubmit={saveNote}>
          <label>
            Chỉ nhân sự quản trị có quyền mới xem được
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Ví dụ: Sở thích chăm sóc, lưu ý khi liên hệ... Không lưu thông tin sức khỏe nhạy cảm."
            />
          </label>
          <div className="mm-cm-form-actions">
            <small>{note.length}/2000 ký tự</small>
            <button
              type="submit"
              disabled={noteMutation.isPending || note.trim() === customer.note.trim()}
            >
              Lưu ghi chú
            </button>
          </div>
          {noteMutation.isError && (
            <p className="mm-cm-error" role="alert">
              {mutationMessage(noteMutation.error)}
            </p>
          )}
        </form>
      </section>

      {feedback && (
        <p className="mm-cm-success" role="status">
          <CheckCircle2 size={16} />
          {feedback}
        </p>
      )}

      <section className="mm-cm-detail-section">
        <div className="mm-cm-section-heading">
          <FileClock size={19} />
          <h4>Yêu cầu gần đây</h4>
        </div>
        {customer.inquiries.length ? (
          <div className="mm-cm-history">
            {customer.inquiries.map((inquiry, index) => (
              <div key={inquiry.id || index}>
                <strong>{inquiry.serviceName || "Yêu cầu dịch vụ"}</strong>
                <span>
                  {inquiry.status || "Chưa có trạng thái"} · {longDate(inquiry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mm-cm-muted">Chưa có yêu cầu liên hệ được ghi nhận.</p>
        )}
        <Link href="/quan-tri/lich-hen" className="mm-cm-inline-link">
          Đến lịch đặt & yêu cầu <ArrowRight size={15} />
        </Link>
      </section>

      <section className="mm-cm-detail-section">
        <div className="mm-cm-section-heading">
          <ShieldCheck size={19} />
          <h4>Nhật ký chăm sóc & VIP</h4>
        </div>
        {customer.history.length ? (
          <div className="mm-cm-history">
            {customer.history.map((entry, index) => (
              <div key={`${entry.event}-${entry.createdAt}-${index}`}>
                <strong>
                  {entry.event === "customer.vip.updated"
                    ? "Điều chỉnh VIP"
                    : "Cập nhật ghi chú chăm sóc"}
                </strong>
                <span>
                  {longDate(entry.createdAt)}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mm-cm-muted">Chưa có thay đổi được ghi trong nhật ký.</p>
        )}
      </section>
    </aside>
  );
}

export function CustomerManagementAdmin({ mode }: { mode: "customers" | "vip" }) {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<Tier>(mode === "vip" ? "VIP" : "ALL");
  const [status, setStatus] = useState<AccountStatus>("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: "20", tier, status });
  if (search) params.set("q", search);
  const customers = usePrivateData<CustomerPage>(`/admin/customers?${params.toString()}`);
  const detail = usePrivateData<CustomerDetail>(
    `/admin/customers/${selectedId || "00000000-0000-0000-0000-000000000000"}`,
    Boolean(selectedId),
  );

  const searchCustomers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSelectedId(null);
    setSearch(searchDraft.trim());
  };
  const setTierFilter = (value: Tier) => {
    setTier(value);
    setPage(1);
    setSelectedId(null);
  };
  const setAccountFilter = (value: AccountStatus) => {
    setStatus(value);
    setPage(1);
    setSelectedId(null);
  };
  const title = mode === "vip" ? "Sổ hội viên VIP" : "Danh sách khách hàng";

  return (
    <div className="mm-cm">
      <div className="mm-cm-intro">
        <div>
          <p className="mm-cm-overline">QUẢN LÝ MỐI QUAN HỆ KHÁCH HÀNG</p>
          <h2>{title}</h2>
          <p>
            {mode === "vip"
              ? "Theo dõi hạng hội viên đang hiệu lực, gia hạn hoặc thu hồi một cách minh bạch."
              : "Một nơi để tra cứu khách đã đăng ký, theo dõi yêu cầu và chăm sóc sau dịch vụ."}
          </p>
        </div>
        <Link
          href={mode === "vip" ? "/quan-tri/khach-hang" : "/quan-tri/hoi-vien-vip"}
          className="mm-cm-switch"
        >
          {mode === "vip" ? <UsersRound size={17} /> : <Crown size={17} />}
          {mode === "vip" ? "Quản lý khách hàng" : "Quản lý hội viên VIP"}
        </Link>
      </div>

      <section className="mm-cm-metrics" aria-label="Thống kê khách hàng">
        <div>
          <span>
            <UsersRound size={18} /> Tổng khách hàng
          </span>
          <strong>{customers.data?.counts.all ?? "–"}</strong>
          <small>Hồ sơ đã đăng ký</small>
        </div>
        <div>
          <span>
            <Crown size={18} /> Hội viên VIP
          </span>
          <strong>{customers.data?.counts.vip ?? "–"}</strong>
          <small>VIP còn hiệu lực</small>
        </div>
        <div>
          <span>
            <HeartHandshake size={18} /> Khách thường
          </span>
          <strong>{customers.data?.counts.standard ?? "–"}</strong>
          <small>Chưa có VIP hiệu lực</small>
        </div>
        <div>
          <span>
            <CheckCircle2 size={18} /> Hoạt động
          </span>
          <strong>{customers.data?.counts.active ?? "–"}</strong>
          <small>Tài khoản đang mở</small>
        </div>
      </section>

      <div className="mm-cm-content">
        <section className="mm-cm-list" aria-label="Danh sách hồ sơ">
          <form className="mm-cm-toolbar" onSubmit={searchCustomers}>
            <label className="mm-cm-search">
              <Search size={17} />
              <span className="sr-only">Tìm theo tên, email hoặc số điện thoại</span>
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Tìm tên, email, số điện thoại..."
                maxLength={120}
              />
            </label>
            <button className="mm-cm-search-btn" type="submit">
              Tìm kiếm
            </button>
          </form>
          <div className="mm-cm-filters">
            <div role="group" aria-label="Lọc hạng hội viên">
              {(["ALL", "VIP", "STANDARD"] as const).map((value) => (
                <button
                  key={value}
                  className={tier === value ? "is-active" : ""}
                  type="button"
                  onClick={() => setTierFilter(value)}
                >
                  {value === "ALL" ? "Tất cả" : value === "VIP" ? "VIP" : "Thường"}
                </button>
              ))}
            </div>
            <label className="mm-cm-status-filter">
              Trạng thái{" "}
              <select
                value={status}
                onChange={(event) => setAccountFilter(event.target.value as AccountStatus)}
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Tạm khóa</option>
              </select>
            </label>
          </div>

          {customers.isPending ? (
            <div className="mm-cm-empty" role="status">
              Đang tải hồ sơ khách hàng...
            </div>
          ) : customers.isError ? (
            <div className="mm-cm-empty" role="alert">
              <p>{mutationMessage(customers.error)}</p>
              <button type="button" onClick={() => customers.refetch()}>
                Thử lại
              </button>
            </div>
          ) : customers.data?.items.length ? (
            <div className="mm-cm-results">
              <div className="mm-cm-results-heading">
                <span>{customers.data.total} khách hàng phù hợp</span>
                <span>
                  Chọn hồ sơ để xem chi tiết <ArrowRight size={14} />
                </span>
              </div>
              {customers.data.items.map((customer) => (
                <button
                  key={customer.id}
                  className={
                    selectedId === customer.id ? "mm-cm-customer is-selected" : "mm-cm-customer"
                  }
                  type="button"
                  onClick={() => setSelectedId(customer.id)}
                  aria-pressed={selectedId === customer.id}
                >
                  <span className="mm-cm-mini-avatar">
                    {customer.displayName.trim().charAt(0).toLocaleUpperCase("vi-VN") || "K"}
                  </span>
                  <span className="mm-cm-customer-main">
                    <strong>{customer.displayName}</strong>
                    <small>{customer.phone || customer.email || "Chưa cập nhật liên hệ"}</small>
                    <span>
                      <CustomerBadge customer={customer} />{" "}
                      <span className={customer.isActive ? "mm-cm-dot" : "mm-cm-dot is-off"} />{" "}
                      {customer.isActive ? "Đang hoạt động" : "Tạm khóa"}
                    </span>
                  </span>
                  <span className="mm-cm-customer-side">
                    <strong>{customer.inquiryCount}</strong>
                    <small>Yêu cầu</small>
                    <small>{shortDate(customer.lastContactAt)}</small>
                  </span>
                  <ChevronRight size={18} className="mm-cm-row-arrow" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mm-cm-empty">
              <UsersRound size={30} />
              <strong>Chưa có khách hàng phù hợp</strong>
              <p>Thử chọn bộ lọc khác hoặc kiểm tra từ khóa tìm kiếm.</p>
            </div>
          )}

          {!!customers.data && customers.data.total > 0 && (
            <div className="mm-cm-pagination">
              <span>
                Trang {page} / {Math.ceil(customers.data.total / customers.data.limit)}
              </span>
              <div>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((old) => old - 1);
                    setSelectedId(null);
                  }}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  disabled={!customers.data.hasMore}
                  onClick={() => {
                    setPage((old) => old + 1);
                    setSelectedId(null);
                  }}
                  aria-label="Trang sau"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </section>

        {selectedId ? (
          detail.isPending ? (
            <aside className="mm-cm-detail mm-cm-detail-placeholder">
              Đang tải thông tin hồ sơ...
            </aside>
          ) : detail.isError ? (
            <aside className="mm-cm-detail mm-cm-detail-placeholder">
              <p>{mutationMessage(detail.error)}</p>
              <button type="button" onClick={() => detail.refetch()}>
                Thử lại
              </button>
              <button type="button" onClick={() => setSelectedId(null)}>
                Đóng
              </button>
            </aside>
          ) : detail.data ? (
            <CustomerDetails
              key={selectedId}
              customer={detail.data}
              onClose={() => setSelectedId(null)}
            />
          ) : null
        ) : (
          <aside className="mm-cm-detail mm-cm-detail-placeholder">
            <div className="mm-cm-placeholder-icon">
              <UsersRound size={27} />
            </div>
            <h3>Chọn một khách hàng</h3>
            <p>Hồ sơ, lịch sử yêu cầu, ghi chú chăm sóc và thông tin VIP sẽ hiển thị tại đây.</p>
            <ShieldCheck size={19} />
            <small>Dữ liệu chỉ dành cho người có quyền quản trị.</small>
          </aside>
        )}
      </div>
    </div>
  );
}
