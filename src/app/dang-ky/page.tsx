import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Khách hàng mới"
      title="Tạo tài khoản Mộc Maria"
      description="Tài khoản giúp bạn đặt lịch nhanh hơn, lưu lịch sử chăm sóc và kết nối với chuyên viên."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-semibold text-[var(--moc-green)]">
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
