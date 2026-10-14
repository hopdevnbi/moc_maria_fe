"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Eye,
  KeyRound,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  UsersRound,
  UserRoundCog,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";
import "./access-admin.css";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "BRANCH_MANAGER"
  | "RECEPTIONIST"
  | "THERAPIST"
  | "DOCTOR_CONSULTANT"
  | "CUSTOMER";

type Account = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roles: Role[];
  isStaff: boolean;
  hasCustomerProfile: boolean;
};

type AccountsPage = {
  items: Account[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  counts: { all: number; active: number; superAdmins: number; staff: number };
};

type RoleRecord = { name: Role; description: string | null; permissions: string[]; users: number };
type HistoryRecord = {
  event: string;
  createdAt: string;
  actorName: string | null;
  metadata: { before?: Role[]; after?: Role[]; reason?: string; role?: Role };
};

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Quản trị viên",
  BRANCH_MANAGER: "Quản lý cơ sở",
  RECEPTIONIST: "Support / Lễ tân",
  THERAPIST: "Kỹ thuật viên (KTV)",
  DOCTOR_CONSULTANT: "Tư vấn viên",
  CUSTOMER: "Khách hàng",
};

const ROLE_HELP: Record<Role, string> = {
  SUPER_ADMIN: "Toàn quyền hệ thống, được quản lý các tài khoản và phân vai.",
  ADMIN: "Quản trị vận hành; không được nâng người khác thành Super Admin.",
  BRANCH_MANAGER: "Vai trò quản lý cơ sở theo những quyền đã được cấu hình.",
  RECEPTIONIST: "Hỗ trợ khách và lễ tân; dùng cổng nhân sự, không mặc nhiên là quản trị viên.",
  THERAPIST: "Quyền tài khoản KTV. Không thay thế bước đào tạo, xét duyệt hay phân công dịch vụ.",
  DOCTOR_CONSULTANT: "Vai trò chuyên viên tư vấn theo chính sách phân quyền đang lưu.",
  CUSTOMER: "Tài khoản khách hàng, truy cập phần tự phục vụ của chính mình.",
};

const PERMISSION_LABELS: Record<string, string> = {
  "admin.portal": "Vào khu vực quản trị",
  "users.manage": "Quản lý tài khoản",
  "roles.manage": "Phân quyền & cấu hình",
  "staff.manage": "Quản lý KTV, dịch vụ và cơ sở",
  "customers.manage": "Quản lý khách hàng",
  "staff.portal": "Cổng nhân sự/KTV",
  "customer.portal": "Cổng khách hàng",
  "profile.self": "Chỉnh sửa hồ sơ cá nhân",
};

const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "Chưa có";

function RoleTag({ name }: { name: Role }) {
  return (
    <span className={name === "SUPER_ADMIN" ? "mm-access-tag is-super" : "mm-access-tag"}>
      {name === "SUPER_ADMIN" && <Crown size={13} />}
      {ROLE_LABELS[name]}
    </span>
  );
}

function PermissionMatrix({ roles }: { roles: RoleRecord[] }) {
  const [expanded, setExpanded] = useState<Role | null>("SUPER_ADMIN");
  return (
    <section className="mm-access-panel mm-access-matrix">
      <header>
        <span className="mm-access-eyebrow">QUYỀN HẠN HIỆN TẠI</span>
        <h3>Vai trò & những quyền được cấp</h3>
        <p>
          Bảng này đọc trực tiếp từ cơ sở dữ liệu. Cấp vai trò không đồng nghĩa KTV tự được duyệt
          hoặc có quyền chỉnh giá.
        </p>
      </header>
      <div className="mm-access-roles">
        {roles.map((role) => (
          <div className="mm-access-role" key={role.name}>
            <button
              type="button"
              onClick={() => setExpanded((old) => (old === role.name ? null : role.name))}
              aria-expanded={expanded === role.name}
            >
              <span>
                <RoleTag name={role.name} />
                <small>{ROLE_HELP[role.name]}</small>
              </span>
              <span className="mm-access-role-count">
                {role.users} tài khoản <ChevronRight size={17} />
              </span>
            </button>
            {expanded === role.name && (
              <div className="mm-access-role-rights">
                <p>{role.description || "Quyền được định nghĩa theo cấu hình hệ thống."}</p>
                <div>
                  {role.permissions.map((permission) => (
                    <span key={permission}>
                      <CheckCircle2 size={14} />
                      {PERMISSION_LABELS[permission] || permission}
                    </span>
                  ))}
                </div>
                {role.permissions.length === 0 && (
                  <p>Vai trò chưa có quyền hệ thống được cấu hình.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mm-access-tip">
        <ShieldCheck size={16} /> Quyền chi tiết do hệ thống quản lý tập trung. Không cho phép sửa
        trực tiếp quyền gốc của vai trò từ màn hình này để tránh mở quyền ngoài ý muốn.
      </p>
    </section>
  );
}

function AccountEditor({ account, roles }: { account: Account; roles: RoleRecord[] }) {
  const { user } = useAuth();
  const currentAccount = account.id === user?.id;
  const [targetRole, setTargetRole] = useState<Role>(
    account.roles.find((role) => role !== "CUSTOMER") || "CUSTOMER",
  );
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [statusPassword, setStatusPassword] = useState("");
  const [statusConfirmation, setStatusConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const changeRole = usePrivateMutation<Account>();
  const updateStatus = usePrivateMutation<{ id: string; isActive: boolean }>();
  const audit = usePrivateData<HistoryRecord[]>(`/admin/access/users/${account.id}/history`);
  const primary = account.roles.find((r) => r !== "CUSTOMER") || "CUSTOMER";
  const touchesSuper = primary === "SUPER_ADMIN" || targetRole === "SUPER_ADMIN";
  const sensitiveStatus = account.isActive && account.roles.includes("SUPER_ADMIN");
  const canChange =
    !currentAccount &&
    targetRole !== primary &&
    reason.trim().length >= 10 &&
    (!touchesSuper || (confirmation === "CONFIRM_SUPER_ADMIN" && password.length > 0));

  async function applyRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canChange) return;
    setNotice("");
    try {
      await changeRole.mutateAsync({
        path: `/admin/access/users/${account.id}/role`,
        method: "PATCH",
        body: {
          role: targetRole,
          reason: reason.trim(),
          ...(touchesSuper
            ? { confirmation: "CONFIRM_SUPER_ADMIN", currentPassword: password }
            : {}),
        },
      });
      setNotice("Đã cập nhật phân quyền và thu hồi phiên đăng nhập cũ của tài khoản này.");
      setReason("");
      setPassword("");
      setConfirmation("");
    } catch {
      /* Error rendered beneath action. */
    }
  }

  async function applyStatus() {
    setNotice("");
    try {
      await updateStatus.mutateAsync({
        path: `/admin/access/users/${account.id}/status`,
        method: "PATCH",
        body: {
          isActive: !account.isActive,
          ...(sensitiveStatus
            ? { confirmation: statusConfirmation, currentPassword: statusPassword }
            : {}),
        },
      });
      setConfirmStatus(false);
      setStatusPassword("");
      setStatusConfirmation("");
      setNotice(account.isActive ? "Đã khóa tài khoản." : "Đã mở lại tài khoản.");
    } catch {
      /* Error rendered beneath action. */
    }
  }

  return (
    <aside
      className="mm-access-panel mm-access-editor"
      aria-label={`Phân quyền cho ${account.displayName}`}
    >
      <div className="mm-access-editor-head">
        <span className="mm-access-avatar">{account.displayName.charAt(0).toUpperCase()}</span>
        <div>
          <span className="mm-access-eyebrow">HỒ SƠ PHÂN QUYỀN</span>
          <h3>{account.displayName}</h3>
          <small>{account.email || account.phone || "Chưa có liên hệ"}</small>
        </div>
      </div>
      <div className="mm-access-statusline">
        <span className={account.isActive ? "mm-access-status is-active" : "mm-access-status"}>
          {account.isActive ? "Đang hoạt động" : "Đã khóa"}
        </span>
        {account.roles.map((role) => (
          <RoleTag name={role} key={role} />
        ))}
      </div>
      <div className="mm-access-info">
        <span>Ngày tạo: {dateLabel(account.createdAt)}</span>
        <span>Đăng nhập gần nhất: {dateLabel(account.lastLoginAt)}</span>
      </div>

      <form onSubmit={(event) => void applyRole(event)} className="mm-access-form">
        <h4>
          <UserRoundCog size={18} /> Điều chỉnh vai trò
        </h4>
        <label>
          Vai trò cấp cho tài khoản
          <select
            value={targetRole}
            disabled={currentAccount || changeRole.isPending}
            onChange={(event) => {
              setTargetRole(event.target.value as Role);
              setNotice("");
            }}
          >
            {roles
              .filter((role) => role.name !== "CUSTOMER" || account.hasCustomerProfile)
              .map((role) => (
                <option key={role.name} value={role.name}>
                  {ROLE_LABELS[role.name]}
                </option>
              ))}
          </select>
        </label>
        <p className="mm-access-help">{ROLE_HELP[targetRole]}</p>
        {account.hasCustomerProfile && targetRole !== "CUSTOMER" && (
          <p className="mm-access-help">
            Quyền khách hàng hiện có sẽ được giữ lại khi thêm vai trò nhân sự.
          </p>
        )}
        <label>
          Lý do cấp/đổi quyền (bắt buộc, tối thiểu 10 ký tự)
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            minLength={10}
            rows={3}
            placeholder="Nêu lý do hoặc người phụ trách phê duyệt thay đổi quyền..."
            disabled={currentAccount}
          />
        </label>
        {touchesSuper && (
          <div className="mm-access-sensitive">
            <strong>
              <LockKeyhole size={16} /> Thao tác quyền cao nhất
            </strong>
            <p>
              Để cấp hoặc thu hồi Super Admin, cần xác nhận chính xác chuỗi dưới đây và nhập lại mật
              khẩu Super Admin của bạn.
            </p>
            <label>
              Nhập <code>CONFIRM_SUPER_ADMIN</code>
              <input
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={currentAccount}
              />
            </label>
            <label>
              Mật khẩu Super Admin hiện tại
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={currentAccount}
              />
            </label>
          </div>
        )}
        {currentAccount && (
          <p className="mm-access-warning">
            Bạn không thể tự thay đổi vai trò hoặc tự khóa tài khoản đang sử dụng.
          </p>
        )}
        <button
          className="mm-access-primary"
          type="submit"
          disabled={!canChange || changeRole.isPending}
        >
          {changeRole.isPending ? "Đang lưu..." : "Xác nhận thay đổi vai trò"}
        </button>
        {changeRole.isError && (
          <p role="alert" className="mm-access-error">
            {mutationMessage(changeRole.error)}
          </p>
        )}
      </form>

      {!currentAccount && (
        <section className="mm-access-account-control">
          <h4>
            <ShieldOff size={17} /> Trạng thái tài khoản
          </h4>
          <p>
            {account.isActive
              ? "Khóa tài khoản sẽ chấm dứt các phiên đăng nhập đang hoạt động."
              : "Mở lại cho phép tài khoản đăng nhập và sử dụng quyền được cấp."}
          </p>
          {confirmStatus ? (
            <div className="mm-access-confirm">
              <strong>
                {account.isActive ? "Xác nhận khóa tài khoản này?" : "Xác nhận mở lại tài khoản?"}
              </strong>
              {sensitiveStatus && (
                <div className="mm-access-form">
                  <p className="mm-access-warning">
                    Khóa Super Admin phải được xác nhận lại bằng mật khẩu quản trị. Không thể khóa
                    Super Admin hoạt động cuối cùng.
                  </p>
                  <label>
                    Nhập <code>CONFIRM_SUPER_ADMIN</code>
                    <input
                      value={statusConfirmation}
                      onChange={(event) => setStatusConfirmation(event.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Mật khẩu Super Admin hiện tại
                    <input
                      type="password"
                      value={statusPassword}
                      onChange={(event) => setStatusPassword(event.target.value)}
                      autoComplete="current-password"
                    />
                  </label>
                </div>
              )}
              <div>
                <button
                  type="button"
                  disabled={
                    updateStatus.isPending ||
                    (sensitiveStatus &&
                      (statusConfirmation !== "CONFIRM_SUPER_ADMIN" || !statusPassword))
                  }
                  onClick={() => void applyStatus()}
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmStatus(false)}
                  disabled={updateStatus.isPending}
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mm-access-secondary"
              onClick={() => setConfirmStatus(true)}
            >
              {account.isActive ? "Khóa tài khoản" : "Mở lại tài khoản"}
            </button>
          )}
          {updateStatus.isError && (
            <p role="alert" className="mm-access-error">
              {mutationMessage(updateStatus.error)}
            </p>
          )}
        </section>
      )}

      {notice && (
        <p role="status" className="mm-access-success">
          <CheckCircle2 size={17} />
          {notice}
        </p>
      )}
      <section className="mm-access-audit">
        <h4>
          <Eye size={17} /> Nhật ký phân quyền
        </h4>
        {audit.isPending ? (
          <p>Đang tải nhật ký...</p>
        ) : audit.isError ? (
          <p className="mm-access-error">Chưa tải được nhật ký.</p>
        ) : audit.data?.length ? (
          <div className="mm-access-audit-list">
            {audit.data.map((item, index) => (
              <div key={`${item.event}-${item.createdAt}-${index}`}>
                <strong>
                  {item.event === "ACCESS_ACCOUNT_CREATED"
                    ? "Tạo tài khoản"
                    : item.event === "ADMIN_ACCOUNT_DISABLED"
                      ? "Khóa tài khoản"
                      : item.event === "ADMIN_ACCOUNT_ENABLED"
                        ? "Mở tài khoản"
                        : "Cập nhật vai trò"}
                </strong>
                <span>
                  {dateLabel(item.createdAt)} · {item.actorName || "Hệ thống"}
                </span>
                {item.metadata.reason && <small>{item.metadata.reason}</small>}
              </div>
            ))}
          </div>
        ) : (
          <p>Chưa có thay đổi quyền được ghi nhận.</p>
        )}
      </section>
    </aside>
  );
}

function CreateAccount({ roles, onClose }: { roles: RoleRecord[]; onClose: () => void }) {
  const create = usePrivateMutation<{ account: Account; temporaryPassword: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<{ name: string; password: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await create.mutateAsync({
        path: "/admin/access/users",
        body: {
          displayName: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          ...(role === "SUPER_ADMIN" ? { currentPassword: password, confirmation } : {}),
        },
      });
      setResult({ name: response.account.displayName, password: response.temporaryPassword });
      setPassword("");
    } catch {
      /* Error rendered below form. */
    }
  }

  return (
    <div className="mm-access-modal-backdrop" role="presentation">
      <section
        className="mm-access-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tạo tài khoản nhân sự"
      >
        <header>
          <div>
            <span className="mm-access-eyebrow">THÊM NHÂN SỰ</span>
            <h3>Tạo tài khoản mới</h3>
          </div>
          <button
            type="button"
            className="mm-access-icon-button"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={21} />
          </button>
        </header>
        {result ? (
          <div className="mm-access-credential">
            <CheckCircle2 size={30} />
            <h4>Đã tạo {result.name}</h4>
            <p>
              Mật khẩu tạm chỉ hiển thị một lần. Hãy gửi riêng cho nhân sự qua kênh an toàn, không
              đăng vào nhóm.
            </p>
            <div>
              <code>{result.password}</code>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(result.password)}
                aria-label="Sao chép mật khẩu"
              >
                <Copy size={17} />
              </button>
            </div>
            <p>
              Hệ thống yêu cầu đổi mật khẩu ngay lần đăng nhập đầu tiên. KTV phải được xét duyệt
              riêng trước khi nhận dịch vụ.
            </p>
            <button type="button" className="mm-access-primary" onClick={onClose}>
              Đã lưu mật khẩu, đóng
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="mm-access-form">
            <label>
              Tên hiển thị{" "}
              <input
                required
                minLength={2}
                maxLength={160}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Họ và tên nhân sự"
              />
            </label>
            <label>
              Email đăng nhập{" "}
              <input
                type="email"
                value={email}
                maxLength={320}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="diachi@email.com"
              />
            </label>
            <label>
              Số điện thoại (có thể thay email){" "}
              <input
                value={phone}
                maxLength={32}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09..."
              />
            </label>
            <label>
              Vai trò đầu tiên
              <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {roles
                  .filter((item) => item.name !== "CUSTOMER")
                  .map((item) => (
                    <option key={item.name} value={item.name}>
                      {ROLE_LABELS[item.name]}
                    </option>
                  ))}
              </select>
            </label>
            <p className="mm-access-help">{ROLE_HELP[role]}</p>
            {role === "SUPER_ADMIN" && (
              <div className="mm-access-sensitive">
                <strong>
                  <KeyRound size={16} /> Xác thực cấp Super Admin
                </strong>
                <label>
                  Nhập <code>CONFIRM_SUPER_ADMIN</code>
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </label>
                <label>
                  Mật khẩu của chính Super Admin đang thao tác
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            <p className="mm-access-help">
              Hệ thống tự tạo mật khẩu mạnh, không tự gửi email. Vai trò nhân sự không tự cấp chứng
              chỉ KTV.
            </p>
            {create.isError && (
              <p className="mm-access-error" role="alert">
                {mutationMessage(create.error)}
              </p>
            )}
            <button
              className="mm-access-primary"
              type="submit"
              disabled={
                create.isPending ||
                (!email.trim() && !phone.trim()) ||
                (role === "SUPER_ADMIN" && (confirmation !== "CONFIRM_SUPER_ADMIN" || !password))
              }
            >
              {create.isPending ? "Đang tạo tài khoản..." : "Tạo tài khoản nhân sự"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export function AccessAdmin() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"accounts" | "roles">("accounts");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const params = new URLSearchParams({ page: String(page), limit: "20", role, status });
  if (search) params.set("q", search);
  const accounts = usePrivateData<AccountsPage>(`/admin/access/users?${params.toString()}`);
  const roles = usePrivateData<RoleRecord[]>("/admin/access/roles");
  const selected = accounts.data?.items.find((item) => item.id === selectedId);
  const canOpen = user?.roles.includes("SUPER_ADMIN") && user.permissions.includes("roles.manage");

  if (!canOpen)
    return (
      <div className="mm-access-panel mm-access-empty">
        <LockKeyhole size={30} />
        <h3>Khu vực dành riêng cho Super Admin</h3>
        <p>Không thể xem hoặc thay đổi quyền tài khoản bằng vai trò hiện tại.</p>
      </div>
    );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
    setSelectedId(null);
  }
  function switchFilter(value: Role | "ALL") {
    setRole(value);
    setPage(1);
    setSelectedId(null);
  }

  return (
    <div className="mm-access">
      <div className="mm-access-title-row">
        <div>
          <span className="mm-access-eyebrow">QUẢN LÝ NHÂN SỰ & BẢO MẬT</span>
          <h2>Trung tâm phân quyền</h2>
          <p>
            Quản trị vai trò của nhân viên, KTV và hỗ trợ khách hàng. Mọi thay đổi quyền được ghi
            lại.
          </p>
        </div>
        <button
          className="mm-access-primary"
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={!roles.data?.length}
        >
          <Plus size={17} /> Thêm tài khoản
        </button>
      </div>
      <div className="mm-access-stats">
        <div>
          <UsersRound size={19} />
          <span>Tổng tài khoản</span>
          <strong>{accounts.data?.counts.all ?? "–"}</strong>
        </div>
        <div>
          <CheckCircle2 size={19} />
          <span>Đang hoạt động</span>
          <strong>{accounts.data?.counts.active ?? "–"}</strong>
        </div>
        <div>
          <Crown size={19} />
          <span>Super Admin</span>
          <strong>{accounts.data?.counts.superAdmins ?? "–"}</strong>
        </div>
        <div>
          <ShieldCheck size={19} />
          <span>Hồ sơ nhân sự</span>
          <strong>{accounts.data?.counts.staff ?? "–"}</strong>
        </div>
      </div>
      <div className="mm-access-tabs" role="tablist" aria-label="Nội dung phân quyền">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "accounts"}
          className={mode === "accounts" ? "is-active" : ""}
          onClick={() => setMode("accounts")}
        >
          <UsersRound size={16} />
          Tài khoản & phân vai
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "roles"}
          className={mode === "roles" ? "is-active" : ""}
          onClick={() => setMode("roles")}
        >
          <ShieldCheck size={16} />
          Vai trò & quyền truy cập
        </button>
      </div>
      {mode === "roles" ? (
        roles.isPending ? (
          <div className="mm-access-panel mm-access-empty">Đang tải quyền hạn...</div>
        ) : roles.isError ? (
          <div className="mm-access-panel mm-access-empty" role="alert">
            {mutationMessage(roles.error)}{" "}
            <button type="button" onClick={() => void roles.refetch()}>
              Thử lại
            </button>
          </div>
        ) : (
          <PermissionMatrix roles={roles.data || []} />
        )
      ) : (
        <div className="mm-access-columns">
          <section className="mm-access-panel mm-access-directory">
            <form className="mm-access-search" onSubmit={submitSearch}>
              <Search size={17} />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Tìm tên, email, số điện thoại..."
                maxLength={120}
                aria-label="Tìm kiếm tài khoản"
              />
              <button type="submit">Tìm kiếm</button>
            </form>
            <div className="mm-access-filters">
              <select
                aria-label="Lọc vai trò"
                value={role}
                onChange={(event) => switchFilter(event.target.value as Role | "ALL")}
              >
                <option value="ALL">Tất cả vai trò</option>
                {roles.data?.map((item) => (
                  <option value={item.name} key={item.name}>
                    {ROLE_LABELS[item.name]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Lọc trạng thái"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                  setPage(1);
                  setSelectedId(null);
                }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã khóa</option>
              </select>
            </div>
            {accounts.isPending ? (
              <div className="mm-access-empty">Đang tải tài khoản...</div>
            ) : accounts.isError ? (
              <div className="mm-access-empty" role="alert">
                {mutationMessage(accounts.error)}
                <button type="button" onClick={() => void accounts.refetch()}>
                  Thử lại
                </button>
              </div>
            ) : accounts.data?.items.length ? (
              <>
                <div className="mm-access-result-heading">
                  {accounts.data.total} tài khoản phù hợp
                </div>
                {accounts.data.items.map((account) => (
                  <button
                    type="button"
                    aria-pressed={selectedId === account.id}
                    key={account.id}
                    className={
                      selectedId === account.id
                        ? "mm-access-account is-selected"
                        : "mm-access-account"
                    }
                    onClick={() => setSelectedId(account.id)}
                  >
                    <span className="mm-access-small-avatar">
                      {account.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="mm-access-account-body">
                      <strong>
                        {account.displayName}
                        {account.id === user?.id && <small> (Bạn)</small>}
                      </strong>
                      <small>{account.email || account.phone || "Chưa cập nhật liên hệ"}</small>
                      <span>
                        {account.roles.map((name) => (
                          <RoleTag name={name} key={name} />
                        ))}
                      </span>
                    </span>
                    <span
                      className={account.isActive ? "mm-access-dot is-active" : "mm-access-dot"}
                      title={account.isActive ? "Hoạt động" : "Bị khóa"}
                    />
                    <ArrowRight size={16} />
                  </button>
                ))}
                <div className="mm-access-pagination">
                  <span>
                    Trang {accounts.data.page} /{" "}
                    {Math.max(1, Math.ceil(accounts.data.total / accounts.data.limit))}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => {
                        setPage((n) => n - 1);
                        setSelectedId(null);
                      }}
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      disabled={!accounts.data.hasMore}
                      onClick={() => {
                        setPage((n) => n + 1);
                        setSelectedId(null);
                      }}
                      aria-label="Trang tiếp"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mm-access-empty">
                <UsersRound size={30} />
                <strong>Chưa có tài khoản phù hợp</strong>
                <p>Thử từ khóa hoặc bộ lọc khác.</p>
              </div>
            )}
          </section>
          {selected && roles.data ? (
            <AccountEditor key={selected.id} account={selected} roles={roles.data} />
          ) : (
            <aside className="mm-access-panel mm-access-empty mm-access-placeholder">
              <span>
                <UserRoundCog size={29} />
              </span>
              <h3>Chọn một tài khoản</h3>
              <p>
                Xem vai trò, thay đổi quyền và kiểm tra nhật ký thao tác. Không ảnh hưởng đến dữ
                liệu khách hoặc lịch đã đặt.
              </p>
            </aside>
          )}
        </div>
      )}
      {createOpen && roles.data && (
        <CreateAccount roles={roles.data} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
