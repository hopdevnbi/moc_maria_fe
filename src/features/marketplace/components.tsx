import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, Leaf, MapPin, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { AccountNav } from "@/features/auth/components/AccountNav";
import { formatPrice } from "./format";
import type { Provider, ServiceItem } from "./types";
import "@/app/home.css";
import "./marketplace.css";

export function Brand() {
  return (
    <Link href="/" aria-label="Mộc Maria — Trang chủ" className="moc-brand">
      <Image src="/brand/moc-maria-mark.webp" alt="" width={64} height={44} />
      <span className="moc-brand-type">
        <span className="moc-brand-name">Mộc Maria</span>
        <span className="moc-brand-descriptor">WELLNESS LOUNGE</span>
      </span>
    </Link>
  );
}

export function MarketShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="wellness-home market-shell">
      <a href="#main" className="moc-skip-link">
        Đi đến nội dung
      </a>
      <div className="moc-topline">
        <span>Một khoảng lặng, dành riêng cho bạn.</span>
        <span className="moc-topline-right">TỰ NHIÊN. TẬN TÂM. AN YÊN.</span>
      </div>
      <header className="market-header moc-container">
        <Brand />
        <nav aria-label="Điều hướng chính" className="market-nav">
          <Link href="/dich-vu">Dịch vụ</Link>
          <Link href="/chuyen-vien">Chuyên viên</Link>
          <Link href="/bang-gia">Bảng giá</Link>
          <Link href="/tro-thanh-ktv">Trở thành KTV</Link>
        </nav>
        <AccountNav />
      </header>
      <main id="main" className="moc-container market-main">
        <div className="market-title">
          <p className="moc-eyebrow">{eyebrow || "CHĂM SÓC THEO CÁCH CỦA BẠN"}</p>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {children}
      </main>
      <footer className="market-footer moc-container">
        <Brand />
        <nav aria-label="Chân trang">
          <Link href="/dich-vu">Dịch vụ</Link>
          <Link href="/bang-gia">Bảng giá</Link>
          <Link href="/tro-thanh-ktv">Đồng hành cùng Mộc</Link>
          <a href="https://www.facebook.com/mocmariads" target="_blank" rel="noopener noreferrer">
            Liên hệ Mộc Maria
          </a>
        </nav>
        <p>© 2026 Mộc Maria · Nơi gửi trao sức khỏe.</p>
      </footer>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  error = false,
}: {
  title: string;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`market-empty ${error ? "market-error" : ""}`}
      role={error ? "alert" : undefined}
    >
      <span className="market-empty-icon">
        <Leaf size={32} strokeWidth={1.3} />
      </span>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="market-grid" aria-label="Đang tải dữ liệu" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="market-skeleton" />
      ))}
    </div>
  );
}

export function ServiceCard({ item }: { item: ServiceItem }) {
  const prices = item.variants
    .map((variant) => Number(variant.priceVnd))
    .filter((price) => Number.isSafeInteger(price) && price >= 0);
  return (
    <article className="market-card service-card">
      <div className="service-card-art" aria-hidden="true">
        <Leaf size={56} strokeWidth={0.8} />
        <span>MỘC MARIA</span>
      </div>
      <div className="market-card-body">
        <p className="moc-eyebrow">CHĂM SÓC & THƯ GIÃN</p>
        <h3>
          <Link href={`/dich-vu/${encodeURIComponent(item.service.slug)}`}>
            {item.service.name}
          </Link>
        </h3>
        <p className="market-clamp">
          {item.service.description ||
            "Khám phá thông tin và những lựa chọn chăm sóc phù hợp với bạn."}
        </p>
        <div className="market-card-meta">
          <Clock3 size={16} />
          <span>
            {item.variants.length
              ? [...new Set(item.variants.map((variant) => variant.durationMinutes))].join(" / ") +
                " phút"
              : "Thời lượng đang cập nhật"}
          </span>
        </div>
        <div className="market-card-bottom">
          <strong>
            {prices.length ? "Từ " + formatPrice(Math.min(...prices)) : "Giá đang cập nhật"}
          </strong>
          <Link
            href={`/dich-vu/${encodeURIComponent(item.service.slug)}`}
            aria-label={`Xem gói ${item.service.name}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProviderCard({ provider }: { provider: Provider }) {
  // Only local, reviewed media is rendered until the dedicated upload/CDN pipeline is configured.
  const avatarUrl =
    provider.avatarUrl?.startsWith("/media/") && !provider.avatarUrl.includes("..")
      ? provider.avatarUrl
      : null;
  return (
    <article className="market-card provider-card">
      <div className="provider-avatar" aria-label={`Ảnh đại diện của ${provider.publicName}`}>
        {avatarUrl ? (
          <Image src={avatarUrl} alt={provider.publicName} width={96} height={96} unoptimized />
        ) : (
          <span>
            {provider.publicName
              .trim()
              .split(/\s+/)
              .slice(-2)
              .map((part) => part[0])
              .join("")}
          </span>
        )}
      </div>
      <div className="market-card-body">
        <span className="market-badge">
          <ShieldCheck size={15} />
          Đào tạo nội bộ Mộc Maria
        </span>
        <h3>
          <Link href={`/chuyen-vien/${provider.id}`}>{provider.publicName}</Link>
        </h3>
        {provider.title && (
          <p>
            {provider.title}
            {provider.yearsExperience != null
              ? ` · ${provider.yearsExperience} năm kinh nghiệm`
              : ""}
          </p>
        )}
        <p className="market-clamp">
          {provider.introduction || "Chuyên viên đồng hành trong hành trình chăm sóc của bạn."}
        </p>
        <div className="market-card-meta">
          <MapPin size={16} />
          <span>{provider.serviceArea || "Khu vực đang cập nhật"}</span>
        </div>
        <Link className="market-profile-link" href={`/chuyen-vien/${provider.id}`}>
          Tìm hiểu chuyên viên
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
