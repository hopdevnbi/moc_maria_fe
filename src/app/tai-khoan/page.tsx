"use client";

import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useState } from "react";
import { MarketShell } from "@/features/marketplace/components";

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}

function AccountContent() {
  const { user, logoutAll } = useAuth();
  const [logoutNotice, setLogoutNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;

  const hasAdminPortal = user.permissions.includes("admin.portal");
  const hasStaffPortal = user.permissions.includes("staff.portal");

  return (
    <MarketShell title="Một nơi dành riêng cho bạn." eyebrow="TÀI KHOẢN CỦA TÔI">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold text-[var(--moc-green-deep)]">
            Mộc Maria
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logoutAll();
              } catch {
                setLogoutNotice("Chưa đăng xuất được mọi thiết bị. Vui lòng thử lại.");
              } finally {
                setLoggingOut(false);
              }
            }}
            className="rounded-full border border-[var(--moc-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--moc-muted)]"
          >
            {loggingOut ? "Đang đăng xuất..." : "Đăng xuất mọi thiết bị"}
          </button>
        </div>

        {logoutNotice && (
          <p role="alert" className="market-notice">
            {logoutNotice}
          </p>
        )}
        <nav className="market-portal-nav mt-8">
          <Link href="/ktv/ho-so">Hồ sơ ứng tuyển KTV</Link>
          <Link href="/ktv/dao-tao">Đào tạo & chứng nhận</Link>
          <Link href="/dich-vu">Khám phá dịch vụ</Link>
        </nav>
        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-[var(--moc-border)] bg-white/80 p-7">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--moc-green-soft)] text-[var(--moc-green)]">
                <UserRound size={26} />
              </div>
              <div>
                <p className="text-sm text-[var(--moc-muted)]">Tài khoản</p>
                <h1 className="text-2xl font-semibold text-[var(--moc-green-deep)]">
                  {user.displayName}
                </h1>
              </div>
            </div>

            <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--moc-muted)]">Email</dt>
                <dd className="mt-1 font-medium">{user.email ?? "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt className="text-[var(--moc-muted)]">Số điện thoại</dt>
                <dd className="mt-1 font-medium">{user.phone ?? "Chưa cập nhật"}</dd>
              </div>
            </dl>

            {user.mustChangePassword && (
              <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Tài khoản đang dùng mật khẩu tạm. Hãy đổi mật khẩu trước khi tiếp tục sử dụng.
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-[var(--moc-green-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--moc-green)]"
                >
                  {
                    {
                      CUSTOMER: "Khách hàng",
                      THERAPIST: "Chuyên viên",
                      ADMIN: "Quản trị",
                      SUPER_ADMIN: "Quản trị hệ thống",
                      BRANCH_MANAGER: "Quản lý cơ sở",
                      RECEPTIONIST: "Lễ tân",
                      DOCTOR_CONSULTANT: "Chuyên gia tư vấn",
                    }[role]
                  }
                </span>
              ))}
            </div>

            {(hasAdminPortal || hasStaffPortal) && (
              <div className="mt-7 flex flex-wrap gap-3">
                {hasAdminPortal && (
                  <Link
                    href="/quan-tri"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--moc-border)] px-4 py-2 text-sm font-semibold"
                  >
                    <ShieldCheck size={17} />
                    Mở khu vực quản trị
                  </Link>
                )}
                {hasStaffPortal && (
                  <Link
                    href="/ktv/dao-tao"
                    className="rounded-xl border border-[var(--moc-border)] px-4 py-2 text-sm font-semibold"
                  >
                    Đào tạo chuyên viên
                  </Link>
                )}
              </div>
            )}
          </article>

          <ChangePasswordForm />
        </section>
      </div>
    </MarketShell>
  );
}
