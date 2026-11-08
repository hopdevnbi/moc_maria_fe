"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, Save } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import "./ktv-account-admin.css";

interface KtvAccount {
  providerId: string;
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

export function KtvAccountAdmin({ providerId }: { providerId: string }) {
  const { user, authFetch } = useAuth();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  const url = `/admin/provider-display/ktv/${providerId}/account`;
  const query = usePrivateData<KtvAccount>(url, isSuperAdmin);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editVersion, setEditVersion] = useState(0);

  if (!isSuperAdmin) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !query.data) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const displayName = String(values.get("displayName") || "").trim();
    const email = String(values.get("email") || "")
      .trim()
      .toLowerCase();
    const phone = String(values.get("phone") || "").trim();
    const password = String(values.get("password") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    setNotice("");
    setError("");
    if (!email) {
      setError("KTV cần có email đăng nhập.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hai lần nhập mật khẩu không khớp.");
      return;
    }
    if (
      password &&
      (password.length < 10 ||
        password.length > 128 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/\d/.test(password))
    ) {
      setError("Mật khẩu cần 10-128 ký tự, chữ hoa, chữ thường và chữ số.");
      return;
    }
    const changes: Record<string, unknown> = {};
    if (email !== query.data.email) changes.email = email;
    if (phone !== (query.data.phone || "")) changes.phone = phone;
    if (displayName !== query.data.displayName) changes.displayName = displayName;
    if (password) {
      changes.password = password;
      changes.mustChangePassword = values.get("mustChangePassword") === "on";
    }
    if (!Object.keys(changes).length) {
      setNotice("Chưa có thay đổi nào cần lưu.");
      return;
    }
    setBusy(true);
    try {
      await authFetch<KtvAccount>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(changes),
      });
      // Never retain password fields after the request.
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => {
        input.value = "";
      });
      await query.refetch();
      setEditVersion((version) => version + 1);
      setRevealed(false);
      setNotice(
        password || changes.email || changes.phone
          ? "Đã cập nhật đăng nhập KTV. Tất cả phiên đăng nhập cũ của KTV đã được thu hồi."
          : "Đã cập nhật tên tài khoản KTV.",
      );
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ktv-account-editor" aria-label="Tài khoản và bảo mật KTV">
      <div className="ktv-account-head">
        <span className="ktv-account-icon">
          <LockKeyhole size={18} />
        </span>
        <div>
          <h4>Tài khoản & bảo mật</h4>
          <p>Chỉ Super Admin được đổi email đăng nhập, số điện thoại và mật khẩu KTV.</p>
        </div>
      </div>
      {query.isPending ? (
        <p role="status">Đang tải tài khoản...</p>
      ) : query.isError || !query.data?.userId ? (
        <p role="alert">
          Không tải được tài khoản KTV.{" "}
          <button type="button" onClick={() => void query.refetch()}>
            Thử lại
          </button>
        </p>
      ) : (
        <form
          key={query.data.userId + ":" + editVersion}
          className="ktv-account-form"
          onSubmit={(event) => void save(event)}
        >
          <div className="ktv-account-fields">
            <label>
              Tên tài khoản
              <input
                name="displayName"
                required
                minLength={2}
                maxLength={160}
                defaultValue={query.data.displayName}
                autoComplete="off"
              />
            </label>
            <label>
              Email / tên đăng nhập
              <input
                name="email"
                type="email"
                required
                maxLength={320}
                autoComplete="off"
                defaultValue={query.data.email || ""}
              />
            </label>
            <label>
              Số điện thoại đăng nhập
              <input
                name="phone"
                type="tel"
                maxLength={32}
                autoComplete="off"
                defaultValue={query.data.phone || ""}
                placeholder="Có thể để trống"
              />
            </label>
          </div>
          <div className="ktv-account-password-heading">
            <KeyRound size={16} />
            <strong>Đặt mật khẩu mới</strong>
            <small>Để trống nếu không muốn đổi mật khẩu</small>
          </div>
          <div className="ktv-account-fields">
            <label>
              Mật khẩu mới
              <span className="ktv-account-secret">
                <input
                  name="password"
                  type={revealed ? "text" : "password"}
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setRevealed((value) => !value)}
                >
                  {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <label>
              Nhập lại mật khẩu
              <input
                name="confirmPassword"
                type={revealed ? "text" : "password"}
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </div>
          <label className="ktv-account-checkbox">
            <input type="checkbox" name="mustChangePassword" />
            <span>Yêu cầu KTV đổi mật khẩu ở lần đăng nhập tiếp theo</span>
          </label>
          <p className="ktv-account-help">
            Khi đổi email, số điện thoại đăng nhập hoặc mật khẩu, KTV sẽ bị đăng xuất khỏi các thiết
            bị cũ. Các lịch hẹn, tin nhắn, vai trò và ảnh/video không bị thay đổi.
          </p>
          {error && (
            <p className="pd-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="pd-notice" role="status">
              {notice}
            </p>
          )}
          <button type="submit" className="pd-primary" disabled={busy}>
            <Save size={16} /> {busy ? "Đang lưu tài khoản..." : "Lưu tài khoản & bảo mật"}
          </button>
        </form>
      )}
    </section>
  );
}
