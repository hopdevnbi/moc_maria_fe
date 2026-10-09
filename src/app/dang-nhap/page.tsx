import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { safeReturnTo } from "@/features/auth/return-to";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnTo((await searchParams).returnTo, "/chuyen-vien");
  return (
    <AuthShell
      eyebrow="Tài khoản Mộc Maria"
      title="Chào mừng trở lại"
      description="Đăng nhập để quản lý lịch hẹn, hồ sơ và các trải nghiệm dành riêng cho bạn."
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link
            href={"/dang-ky?returnTo=" + encodeURIComponent(returnTo)}
            className="font-semibold text-[var(--moc-green)]"
          >
            Đăng ký ngay
          </Link>
          <span className="mx-2">·</span>
          <Link href="/quen-mat-khau" className="font-semibold text-[var(--moc-green)]">
            Quên mật khẩu
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white/60" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
