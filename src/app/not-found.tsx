import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--moc-gold-deep)]">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--moc-green-deep)]">
          Không tìm thấy trang
        </h1>
        <p className="mt-4 leading-7 text-[var(--moc-muted)]">
          Nội dung anh/chị đang tìm chưa tồn tại hoặc đã được chuyển sang địa chỉ khác.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-full bg-[var(--moc-green)] px-5 py-3 font-semibold text-white"
        >
          Về trang chủ
        </Link>
      </section>
    </main>
  );
}
