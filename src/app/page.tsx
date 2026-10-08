import {
  ArrowRight,
  CalendarDays,
  HeartPulse,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { AccountNav } from "@/features/auth/components/AccountNav";

const foundations = [
  {
    icon: CalendarDays,
    title: "Đặt lịch linh hoạt",
    description:
      "Nền tảng booking sẽ hỗ trợ dịch vụ, cơ sở, chuyên viên và lịch trống theo thời gian thực.",
  },
  {
    icon: HeartPulse,
    title: "Wellness mở rộng",
    description:
      "Không khóa vào massage: sẵn sàng cho trị liệu, phục hồi chức năng và chuyên gia sức khỏe.",
  },
  {
    icon: MessageCircle,
    title: "Kết nối chuyên viên",
    description:
      "Khách hàng và chuyên viên sẽ có thể trao đổi trực tiếp qua hệ thống chat dùng chung.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative isolate px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(218,190,117,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(28,106,73,0.14),transparent_38%)]" />
        <div className="mx-auto max-w-6xl">
          <header className="mb-14 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xl font-semibold tracking-tight text-[var(--moc-green-deep)]">
              Mộc Maria
            </div>
            <AccountNav />
          </header>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--moc-border)] bg-white/70 px-4 py-2 text-sm text-[var(--moc-green)] backdrop-blur">
            <Sparkles size={16} />
            Mộc Maria Wellness Platform
          </div>

          <div className="grid items-end gap-10 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--moc-gold-deep)]">
                Nơi gửi trao sức khỏe
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-[var(--moc-green-deep)] sm:text-6xl lg:text-7xl">
                Một nền tảng chăm sóc cơ thể được xây để lớn cùng Mộc Maria.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--moc-muted)]">
                Nền tảng đang được xây tuần tự: tài khoản, booking, hồ sơ chuyên viên, nhiều cơ sở,
                chat trực tiếp và khu vực quản trị.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[var(--moc-border)] bg-[var(--moc-green)] p-7 text-white shadow-2xl shadow-emerald-950/10">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-emerald-100">Phase 02</p>
                  <p className="mt-2 text-2xl font-semibold">Identity & Access</p>
                </div>
                <div className="rounded-full bg-white/12 p-3">
                  <MapPin size={22} />
                </div>
              </div>
              <p className="mt-8 leading-7 text-emerald-50/90">
                Đăng ký, đăng nhập, phiên bảo mật và phân quyền đang trở thành nền tảng cho toàn bộ
                hành trình khách hàng và nhân viên.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">
                mocmaria.com
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {foundations.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-[var(--moc-border)] bg-white/72 p-6 shadow-sm backdrop-blur"
              >
                <div className="mb-5 inline-flex rounded-2xl bg-[var(--moc-green-soft)] p-3 text-[var(--moc-green)]">
                  <Icon size={22} />
                </div>
                <h2 className="text-xl font-semibold text-[var(--moc-green-deep)]">{title}</h2>
                <p className="mt-3 leading-7 text-[var(--moc-muted)]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
