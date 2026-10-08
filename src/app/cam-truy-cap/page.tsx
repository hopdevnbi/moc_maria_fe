import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-lg text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldX size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-[var(--moc-green-deep)]">
          Bạn chưa có quyền truy cập
        </h1>
        <p className="mt-4 leading-7 text-[var(--moc-muted)]">
          Tài khoản hiện tại không có quyền mở khu vực này.
        </p>
        <Link
          href="/tai-khoan"
          className="mt-7 inline-flex rounded-full bg-[var(--moc-green)] px-5 py-3 font-semibold text-white"
        >
          Về tài khoản
        </Link>
      </section>
    </main>
  );
}
