import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Khôi phục tài khoản"
      title="Quên mật khẩu"
      description="Nhập email hoặc số điện thoại đã đăng ký. Mộc Maria sẽ chuẩn bị yêu cầu đặt lại mật khẩu."
      footer={
        <Link href="/dang-nhap" className="font-semibold text-[var(--moc-green)]">
          Quay lại đăng nhập
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
