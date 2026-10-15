"use client";
import { DEFAULT_BOOKING_NOTE } from "@/shared/booking/inquiry-status";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, Crown, KeyRound, UserPlus, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData, usePrivateMutation } from "./private-api";
import "./admin-intake-tools.css";

type Customer = { id: string; displayName: string; email: string | null; phone: string | null };
type Provider = { id: string; publicName: string; services: Array<{ id: string; name: string }> };
type Options = { customers: Customer[]; providers: Provider[] };
type Provision = {
  customer: Customer;
  temporaryPassword: string;
  mustChangePassword: true;
  emailStatus: "QUEUED" | "NOT_REQUESTED" | "NOT_CONFIGURED" | "FAILED";
};

export function AdminIntakeTools({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const isSuper = !!user?.roles.includes("SUPER_ADMIN");
  const [open, setOpen] = useState<"customer" | "request" | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [issued, setIssued] = useState<Provision | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [location, setLocation] = useState<"AT_HOME" | "AT_BRANCH">("AT_BRANCH");
  const [address, setAddress] = useState("");
  const [requestedAt, setRequestedAt] = useState("");
  const [notes, setNotes] = useState(DEFAULT_BOOKING_NOTE);
  const [reason, setReason] = useState(
    "Tiếp nhận yêu cầu đặt lịch theo thông tin khách hàng cung cấp.",
  );
  const [notice, setNotice] = useState("");
  const options = usePrivateData<Options>(
    `/admin/intake/options?q=${encodeURIComponent(search)}`,
    isSuper,
  );
  const create = usePrivateMutation<Provision>();
  const request = usePrivateMutation<{ id: string }>();
  const customer = options.data?.customers.find((c) => c.id === customerId) ?? issued?.customer;
  const chosenProvider = useMemo(
    () => options.data?.providers.find((p) => p.id === providerId),
    [options.data?.providers, providerId],
  );

  function close() {
    setOpen(null);
    setIssued(null);
    setNotice("");
    create.reset();
    request.reset();
  }

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) return;
    try {
      const result = await create.mutateAsync({
        path: "/admin/intake/customers",
        method: "POST",
        body: {
          displayName: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          sendEmail: !!email.trim() && sendEmail,
        },
      });
      setIssued(result);
      setCustomerId(result.customer.id);
      setNotice("Tài khoản đã được tạo. Mật khẩu tạm chỉ hiển thị một lần trong phiên này.");
      void options.refetch();
    } catch {
      /* show actionable API error */
    }
  }

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    if (
      request.isPending ||
      !customerId ||
      !providerId ||
      !serviceId ||
      !requestedAt ||
      reason.trim().length < 10
    )
      return;
    try {
      await request.mutateAsync({
        path: "/admin/appointment-inquiries",
        method: "POST",
        body: {
          customerId,
          providerId,
          serviceId,
          location,
          address: address.trim(),
          requestedAt: new Date(requestedAt).toISOString(),
          notes: notes.trim(),
          reason: reason.trim(),
        },
      });
      setNotice("Đã tạo yêu cầu và ghi lịch sử quản trị. Đây chưa phải lịch hẹn được xác nhận.");
      setNotes(DEFAULT_BOOKING_NOTE);
      setReason("Tiếp nhận yêu cầu đặt lịch theo thông tin khách hàng cung cấp.");
      onCreated?.();
    } catch {
      /* keep form for retry */
    }
  }

  if (!isSuper) return null;
  return (
    <section className="mm-intake-toolbox" aria-label="Công cụ Super Admin">
      <div className="mm-intake-heading">
        <span className="mm-intake-icon">
          <Crown size={20} />
        </span>
        <div>
          <small>CHỈ SUPER ADMIN</small>
          <h3>Tiếp nhận & cấp tài khoản nhanh</h3>
          <p>
            Tạo khách, cấp thông tin đăng nhập, lập yêu cầu giúp khách. Lịch chính thức và xác nhận
            hoàn thành được xử lý trong quy trình đặt lịch riêng.
          </p>
        </div>
      </div>
      <div className="mm-intake-toolbar">
        <button
          type="button"
          onClick={() => {
            close();
            setOpen("customer");
          }}
        >
          <UserPlus size={16} /> Tạo tài khoản khách
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            setOpen("request");
          }}
        >
          <CalendarPlus size={16} /> Tạo yêu cầu đặt lịch
        </button>
      </div>
      {open && (
        <div className="mm-intake-panel">
          <div className="mm-intake-panel-header">
            <h4>{open === "customer" ? "Thêm khách hàng mới" : "Lập yêu cầu giúp khách"}</h4>
            <button type="button" aria-label="Đóng biểu mẫu" onClick={close}>
              <X size={19} />
            </button>
          </div>
          {notice && (
            <p className="mm-intake-notice" role="status">
              {notice}
            </p>
          )}
          {open === "customer" && !issued && (
            <form className="mm-intake-form" onSubmit={(e) => void createCustomer(e)}>
              <label>
                Họ và tên{" "}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={160}
                />
              </label>
              <label>
                Email đăng nhập{" "}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                />
              </label>
              <label>
                Số điện thoại{" "}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={32}
                />
              </label>
              <label className="mm-intake-check">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />{" "}
                Gửi email thiết lập mật khẩu một lần (nếu có email)
              </label>
              <p>
                Khách cần email hoặc số điện thoại. Mật khẩu tạm được tạo ngẫu nhiên, bắt buộc đổi
                khi đăng nhập.
              </p>
              {create.isError && (
                <p role="alert" className="mm-intake-error">
                  {mutationMessage(create.error)}
                </p>
              )}
              <button
                className="mm-intake-primary"
                disabled={create.isPending || !name.trim() || (!email.trim() && !phone.trim())}
              >
                {create.isPending ? "Đang tạo..." : "Tạo tài khoản an toàn"}
              </button>
            </form>
          )}
          {open === "customer" && issued && (
            <div className="mm-intake-credential">
              <KeyRound size={20} />
              <p>
                <strong>{issued.customer.displayName}</strong>
                <br />
                Tài khoản: <code>{issued.customer.email || issued.customer.phone}</code>
                <br />
                Mật khẩu tạm (chỉ hiển thị một lần): <code>{issued.temporaryPassword}</code>
              </p>
              <p>
                {issued.emailStatus === "QUEUED"
                  ? "Email hướng dẫn thiết lập mật khẩu đã vào hàng đợi gửi (chưa xác nhận đã nhận)."
                  : issued.emailStatus === "NOT_CONFIGURED"
                    ? "Máy chủ chưa cấu hình email. Hãy giao thông tin đăng nhập qua kênh an toàn."
                    : issued.emailStatus === "FAILED"
                      ? "Chưa gửi được email. Hãy giao thông tin đăng nhập qua kênh an toàn."
                      : "Chưa gửi email hướng dẫn."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIssued(null);
                  setOpen("request");
                }}
              >
                Tạo yêu cầu cho khách này
              </button>
            </div>
          )}
          {open === "request" && (
            <form className="mm-intake-form" onSubmit={(e) => void createRequest(e)}>
              <label>
                Tìm khách{" "}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tên, email hoặc số điện thoại"
                />
              </label>
              <label>
                Khách hàng{" "}
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Chọn khách hàng</option>
                  {customer && !options.data?.customers.some((c) => c.id === customer.id) && (
                    <option value={customer.id}>{customer.displayName}</option>
                  )}
                  {options.data?.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} - {c.phone || c.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kỹ thuật viên{" "}
                <select
                  value={providerId}
                  onChange={(e) => {
                    setProviderId(e.target.value);
                    setServiceId("");
                  }}
                  required
                >
                  <option value="">Chọn KTV</option>
                  {options.data?.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.publicName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dịch vụ{" "}
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                  <option value="">Chọn dịch vụ</option>
                  {chosenProvider?.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Thời gian khách mong muốn{" "}
                <input
                  type="datetime-local"
                  value={requestedAt}
                  onChange={(e) => setRequestedAt(e.target.value)}
                  required
                />
              </label>
              <label>
                Hình thức{" "}
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value as "AT_HOME" | "AT_BRANCH")}
                >
                  <option value="AT_BRANCH">Tại cơ sở</option>
                  <option value="AT_HOME">Phục vụ tại nhà</option>
                </select>
              </label>
              <label>
                Địa chỉ{" "}
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  minLength={12}
                  maxLength={300}
                  required
                />
              </label>
              <label>
                Ghi chú khách{" "}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </label>
              <label>
                Lý do tạo yêu cầu (tối thiểu 10 ký tự){" "}
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={10}
                  maxLength={500}
                  required
                />
              </label>
              <p>
                Yêu cầu này có trạng thái chờ phản hồi. Không tạo lịch hoàn thành hoặc mở đánh giá
                KTV.
              </p>
              {options.isError && (
                <p role="alert" className="mm-intake-error">
                  Không tải được danh sách khách/KTV.
                </p>
              )}
              {request.isError && (
                <p role="alert" className="mm-intake-error">
                  {mutationMessage(request.error)}
                </p>
              )}
              <button
                className="mm-intake-primary"
                disabled={
                  request.isPending ||
                  !customerId ||
                  !providerId ||
                  !serviceId ||
                  reason.trim().length < 10
                }
              >
                {request.isPending ? "Đang tạo..." : "Tạo yêu cầu & ghi lịch sử"}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
