import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { safeReturnTo } from "@/features/auth/return-to";

type RegisterPageProps = { searchParams: Promise<{ returnTo?: string }> };

export default function RegisterPage(props: RegisterPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-6 py-20" role="status">
          Đang mở trang đăng ký…
        </div>
      }
    >
      <RegisterContent {...props} />
    </Suspense>
  );
}

async function RegisterContent({ searchParams }: RegisterPageProps) {
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
