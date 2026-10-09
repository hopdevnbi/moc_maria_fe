import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { safeReturnTo } from "@/features/auth/return-to";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnTo((await searchParams).returnTo, "/chuyen-vien");
  return (
    <AuthShell
      eyebrow="Khách hàng mới"
      title="Tạo tài khoản Mộc Maria"
      description="Tài khoản giúp bạn đặt lịch nhanh hơn, lưu lịch sử chăm sóc và kết nối với chuyên viên."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link
            href={"/dang-nhap?returnTo=" + encodeURIComponent(returnTo)}
            className="font-semibold text-[var(--moc-green)]"
          >
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterForm returnTo={returnTo} />
    </AuthShell>
  );
}
