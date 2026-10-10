"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CircleUserRound,
  Crown,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import "./vip-admin.css";

type Tab = "requests" | "members" | "customers" | "settings";
type VipRequest = {
  id: string;
  customerUserId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: string;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
};
type VipMember = {
  customerUserId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
  activeSince: string;
  expiresAt: string | null;
};
type Customer = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  membershipStatus: string | null;
  membershipExpiresAt: string | null;
  createdAt: string;
};
type VipSettings = {
  displayName: string;
  description: string;
  benefits: string[];
  acceptingRequests: boolean;
  durationDays: number | null;
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Không giới hạn";
const formatContact = (email: string | null, phone: string | null) =>
  [phone, email].filter(Boolean).join(" · ") || "Chưa có liên hệ";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thực hiện được yêu cầu.";
const tabs: Array<{ id: Tab; name: string; icon: typeof Crown }> = [
  { id: "requests", name: "Chờ xét duyệt", icon: BadgeCheck },
  { id: "members", name: "Hội viên VIP", icon: Crown },
  { id: "customers", name: "Khách hàng", icon: CircleUserRound },
  { id: "settings", name: "Cấu hình VIP", icon: Settings2 },
];

export function VipAdmin({ initialTab = "requests" }: { initialTab?: Tab }) {
  const { user, authFetch } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [requests, setRequests] = useState<VipRequest[]>([]);
  const [members, setMembers] = useState<VipMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<VipSettings | null>(null);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [benefitsText, setBenefitsText] = useState("");

  const isAdmin = !!user?.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      if (tab === "requests") {
        const result = await authFetch<{ items: VipRequest[] }>(
          "/admin/membership/requests?status=PENDING&limit=100",
          { cache: "no-store" },
        );
        setRequests(result.items);
      } else if (tab === "members") {
        const result = await authFetch<{ items: VipMember[] }>(
          "/admin/membership/members?limit=100",
          { cache: "no-store" },
        );
        setMembers(result.items);
      } else if (tab === "customers") {
        const result = await authFetch<{ items: Customer[] }>(
          "/admin/membership/customers?limit=100" +
            (search ? "&q=" + encodeURIComponent(search) : ""),
          { cache: "no-store" },
        );
        setCustomers(result.items);
      } else {
        const result = await authFetch<VipSettings>("/admin/membership/settings", {
          cache: "no-store",
        });
        setSettings(result);
        setBenefitsText(result.benefits.join("\n"));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, tab, search, authFetch]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function review(id: string, decision: "APPROVE" | "REJECT") {
    if (reason.trim().length < 3) {
      setError("Vui lòng nhập lý do xét duyệt (ít nhất 3 ký tự).");
      return;
    }
    if (
      !window.confirm(
        decision === "APPROVE"
          ? "Bạn chắc chắn muốn kích hoạt VIP cho khách này?"
          : "Bạn muốn từ chối yêu cầu này?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authFetch("/admin/membership/requests/" + encodeURIComponent(id) + "/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      setReason("");
      setNotice(decision === "APPROVE" ? "Đã phê duyệt hội viên VIP." : "Đã từ chối yêu cầu.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeMember(id: string, status: "ACTIVE" | "SUSPENDED") {
    if (reason.trim().length < 3) {
      setError("Vui lòng nhập lý do thay đổi trạng thái.");
      return;
    }
    if (!window.confirm("Xác nhận thay đổi trạng thái hội viên?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authFetch("/admin/membership/members/" + encodeURIComponent(id) + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason.trim() }),
      });
      setReason("");
      setNotice("Đã cập nhật trạng thái hội viên.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggleCustomer(customer: Customer) {
    if (!user?.permissions.includes("users.manage")) return;
    if (
      !window.confirm(
        customer.isActive ? "Tạm khóa tài khoản khách này?" : "Kích hoạt lại tài khoản khách?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await authFetch("/admin/users/" + encodeURIComponent(customer.id) + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });
      setNotice("Đã cập nhật trạng thái tài khoản.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const benefits = benefitsText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      await authFetch("/admin/membership/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, benefits }),
      });
      setNotice("Đã lưu cấu hình VIP. Chỉ quyền lợi được công bố mới hiển thị với khách.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin)
    return (
      <p className="vip-admin-error" role="alert">
        Chỉ ADMIN hoặc SUPER_ADMIN được quản lý và xét duyệt VIP.
      </p>
    );
  return (
    <div className="vip-admin">
      <div className="vip-admin-intro">
        <div>
          <span className="vip-admin-eyebrow">TRUNG TÂM QUẢN TRỊ KHÁCH HÀNG</span>
          <h2>
            Chăm sóc hội viên <em>chu đáo hơn.</em>
          </h2>
          <p>
            Tài khoản khách hàng dùng chung; nâng hạng VIP chỉ có hiệu lực sau khi Admin phê duyệt.
          </p>
        </div>
        <button
          type="button"
          className="vip-admin-refresh"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>
      <nav className="vip-admin-tabs" aria-label="Quản lý khách hàng và VIP">
        {tabs.map(({ id, name, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            <Icon size={17} />
            {name}
            {id === "requests" && requests.length > 0 && (
              <span className="vip-admin-count">{requests.length}</span>
            )}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="vip-admin-error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="vip-admin-notice">
          {notice}
        </div>
      )}
      {loading ? (
        <p role="status" className="vip-admin-empty">
          Đang tải dữ liệu quản trị...
        </p>
      ) : (
        <>
          {tab === "requests" && (
            <section className="vip-admin-panel">
              <div className="vip-admin-section-head">
                <h3>Yêu cầu đang chờ</h3>
                <span>{requests.length} hồ sơ</span>
              </div>
              <label className="vip-admin-input">
                Lý do xét duyệt (bắt buộc cho mỗi thao tác)
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  placeholder="Ví dụ: Xác minh hồ sơ, đáp ứng tiêu chí hội viên..."
                />
              </label>
              {requests.length ? (
                <div className="vip-admin-list">
                  {requests.map((request) => (
                    <article key={request.id} className="vip-admin-record">
                      <div className="vip-admin-record-head">
                        <div>
                          <strong>{request.displayName}</strong>
                          <span>{formatContact(request.email, request.phone)}</span>
                        </div>
                        <small>{formatDate(request.createdAt)}</small>
                      </div>
                      {request.note && <p className="vip-admin-message">{request.note}</p>}
                      <div className="vip-admin-actions">
                        <button
                          type="button"
                          disabled={busy || reason.trim().length < 3}
                          className="vip-admin-approve"
                          onClick={() => void review(request.id, "APPROVE")}
                        >
                          <BadgeCheck size={16} /> Phê duyệt
                        </button>
                        <button
                          type="button"
                          disabled={busy || reason.trim().length < 3}
                          className="vip-admin-reject"
                          onClick={() => void review(request.id, "REJECT")}
                        >
                          Từ chối
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="vip-admin-empty">Chưa có yêu cầu nào đang chờ xét duyệt.</p>
              )}
            </section>
          )}
          {tab === "members" && (
            <section className="vip-admin-panel">
              <div className="vip-admin-section-head">
                <h3>Hội viên VIP</h3>
                <span>{members.length} hồ sơ</span>
              </div>
              <label className="vip-admin-input">
                Lý do thay đổi trạng thái
                <input
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ghi chú để lưu lịch sử thay đổi"
                />
              </label>
              <div className="vip-admin-list">
                {members.map((member) => (
                  <article className="vip-admin-record" key={member.customerUserId}>
                    <div className="vip-admin-record-head">
                      <div>
                        <strong>{member.displayName}</strong>
                        <span>{formatContact(member.email, member.phone)}</span>
                      </div>
                      <span className={"vip-admin-state " + member.status.toLowerCase()}>
                        {member.status === "ACTIVE" ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                    <p>
                      Tham gia: {formatDate(member.activeSince)} · Hạn:{" "}
                      {formatDate(member.expiresAt)}
                    </p>
                    <button
                      type="button"
                      className="vip-admin-quiet"
                      disabled={busy || reason.trim().length < 3}
                      onClick={() =>
                        void changeMember(
                          member.customerUserId,
                          member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        )
                      }
                    >
                      {member.status === "ACTIVE" ? "Tạm dừng VIP" : "Khôi phục VIP"}
                    </button>
                  </article>
                ))}
                {!members.length && (
                  <p className="vip-admin-empty">Chưa có hội viên VIP được phê duyệt.</p>
                )}
              </div>
            </section>
          )}
          {tab === "customers" && (
            <section className="vip-admin-panel">
              <div className="vip-admin-section-head">
                <h3>Danh sách khách hàng</h3>
                <span>{customers.length} hồ sơ</span>
              </div>
              <form
                className="vip-admin-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(q.trim());
                }}
              >
                <input
                  placeholder="Tìm theo tên, số điện thoại, email"
                  maxLength={80}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button type="submit">
                  <Search size={17} /> Tìm kiếm
                </button>
              </form>
              <div className="vip-admin-list">
                {customers.map((customer) => (
                  <article className="vip-admin-record" key={customer.id}>
                    <div className="vip-admin-record-head">
                      <div>
                        <strong>{customer.displayName}</strong>
                        <span>{formatContact(customer.email, customer.phone)}</span>
                      </div>
                      <span
                        className={
                          "vip-admin-state " + (customer.isActive ? "active" : "suspended")
                        }
                      >
                        {customer.isActive ? "Đang hoạt động" : "Đã khóa"}
                      </span>
                    </div>
                    <p>
                      Hạng: {customer.membershipStatus || "Khách thường"} · Tham gia{" "}
                      {formatDate(customer.createdAt)}
                    </p>
                    {user?.permissions.includes("users.manage") && (
                      <button
                        type="button"
                        className="vip-admin-quiet"
                        disabled={busy}
                        onClick={() => void toggleCustomer(customer)}
                      >
                        {customer.isActive ? "Tạm khóa khách hàng" : "Kích hoạt lại"}
                      </button>
                    )}
                  </article>
                ))}
                {!customers.length && (
                  <p className="vip-admin-empty">Chưa tìm thấy tài khoản khách hàng phù hợp.</p>
                )}
              </div>
            </section>
          )}
          {tab === "settings" && settings && (
            <section className="vip-admin-panel">
              <div className="vip-admin-section-head">
                <h3>Thiết lập chương trình VIP</h3>
                <span>Thay đổi chỉ có hiệu lực sau khi lưu</span>
              </div>
              <div className="vip-admin-settings">
                <label className="vip-admin-input">
                  Tên hạng hội viên
                  <input
                    maxLength={80}
                    value={settings.displayName}
                    onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                  />
                </label>
                <label className="vip-admin-input">
                  Mô tả chính sách
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  />
                </label>
                <label className="vip-admin-input">
                  Quyền lợi công bố (mỗi dòng một quyền lợi, tối đa 10)
                  <textarea
                    rows={5}
                    value={benefitsText}
                    onChange={(e) => setBenefitsText(e.target.value)}
                  />
                </label>
                <label className="vip-admin-input">
                  Thời hạn VIP (ngày)
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={settings.durationDays ?? ""}
                    placeholder="Để trống nếu không thời hạn"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        durationDays: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
                <label className="vip-admin-switch">
                  <input
                    type="checkbox"
                    checked={settings.acceptingRequests}
                    onChange={(e) =>
                      setSettings({ ...settings, acceptingRequests: e.target.checked })
                    }
                  />
                  Cho phép khách gửi yêu cầu xét duyệt
                </label>
                <p className="vip-admin-policy">
                  <ShieldCheck size={17} /> Đây là mô tả quyền lợi, không tự động thay đổi giá dịch
                  vụ, lịch hẹn hay điểm thưởng. Cần cấu hình nghiệp vụ riêng nếu muốn áp dụng giảm
                  giá.
                </p>
                <button
                  type="button"
                  className="vip-admin-approve"
                  disabled={busy}
                  onClick={() => void saveSettings()}
                >
                  {busy ? "Đang lưu..." : "Lưu cấu hình VIP"}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
