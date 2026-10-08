import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Bảo mật tài khoản"
      title="Đặt lại mật khẩu"
      description="Tạo mật khẩu mới đủ mạnh để tiếp tục sử dụng tài khoản Mộc Maria."
      footer={
        <Link href="/dang-nhap" className="font-semibold text-[var(--moc-green)]">
          Quay lại đăng nhập
        </Link>
      }
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-white/60" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
