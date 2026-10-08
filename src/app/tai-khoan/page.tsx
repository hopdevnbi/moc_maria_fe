"use client";

import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}

function AccountContent() {
  const { user, logoutAll } = useAuth();
  if (!user) return null;

  const hasAdminPortal = user.permissions.includes("admin.portal");
  const hasStaffPortal = user.permissions.includes("staff.portal");

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold text-[var(--moc-green-deep)]">
            Mộc Maria
          </Link>
          <button
            type="button"
            onClick={() => void logoutAll()}
            className="rounded-full border border-[var(--moc-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--moc-muted)]"
          >
            Đăng xuất mọi thiết bị
          </button>
        </div>

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
                  {role}
                </span>
              ))}
            </div>

            {(hasAdminPortal || hasStaffPortal) && (
              <div className="mt-7 flex flex-wrap gap-3">
                {hasAdminPortal && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--moc-border)] px-4 py-2 text-sm font-semibold">
                    <ShieldCheck size={17} />
                    Khu vực quản trị sẽ mở ở Phase 07
                  </span>
                )}
                {hasStaffPortal && (
                  <span className="rounded-xl border border-[var(--moc-border)] px-4 py-2 text-sm font-semibold">
                    Cổng nhân viên đang được chuẩn bị
                  </span>
                )}
              </div>
            )}
          </article>

          <ChangePasswordForm />
        </section>
      </div>
    </main>
  );
}
