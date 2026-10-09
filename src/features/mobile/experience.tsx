"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flower2,
  HandHeart,
  Heart,
  Home,
  MessageCircle,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { AccountNav } from "@/features/auth/components/AccountNav";
import { formatPrice } from "@/features/marketplace/format";
import type { Provider, ServiceItem } from "@/features/marketplace/types";
import { bookingHref } from "./links";
import "./mobile.css";
import { useCatalogRealtime } from "./useCatalogRealtime";

type Focus = "providers" | "services";
type Props = {
  providers: Provider[];
  services: ServiceItem[];
  providersUnavailable?: boolean;
  catalogUnavailable?: boolean;
  page?: "home" | "providers" | "services";
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] || "")
    .join("")
    .toLocaleUpperCase("vi");
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi");
}

export function MobileNavigation({
  active = "home",
}: {
  active?: "home" | "providers" | "services" | "booking" | "chat" | "account";
}) {
  const nav = [
    { href: "/", label: "KTV", icon: Home, key: "home" },
    { href: "/dich-vu", label: "Dịch vụ", icon: HandHeart, key: "services" },
    { href: "/dat-lich", label: "Đặt lịch", icon: CalendarDays, key: "booking" },
    { href: "/tin-nhan", label: "Chat", icon: MessageCircle, key: "chat" },
    { href: "/tai-khoan", label: "Tài khoản", icon: UserRound, key: "account" },
  ] as const;
  return (
    <nav className="mobile-tabbar" aria-label="Điều hướng nhanh">
      {nav.map(({ href, label, icon: Icon, key }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={"mobile-tab" + (active === key ? " is-current" : "")}
        >
          <span className="mobile-tab-icon">
            <Icon size={21} strokeWidth={active === key ? 2.3 : 1.8} />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function MobileHeader() {
  return (
    <header className="mm-header">
      <div className="mm-container mm-header-inner">
        <Link className="mm-logo" href="/" aria-label="Mộc Maria — trang chủ">
          <Image src="/brand/moc-maria-mark.webp" alt="" width={45} height={40} priority />
          <span>
            <strong>Mộc Maria</strong>
            <small>WELLNESS & CARE</small>
          </span>
        </Link>
        <nav className="mm-desktop-menu" aria-label="Điều hướng chính">
          <Link href="/chuyen-vien">Kỹ thuật viên</Link>
          <Link href="/dich-vu">Dịch vụ</Link>
          <Link href="/tin-nhan">Chat KTV</Link>
          <Link href="/tro-thanh-ktv">Trở thành KTV</Link>
          <Link href="/hoi-vien">Hội viên</Link>
        </nav>
        <div className="mm-account">
          <AccountNav />
        </div>
        <Link href="/tai-khoan" className="mm-account-mobile" aria-label="Tài khoản">
          <UserRound size={22} />
        </Link>
      </div>
    </header>
  );
}

export function ProviderTile({ provider }: { provider: Provider }) {
  const safeAvatar =
    provider.avatarUrl?.startsWith("/media/") && !provider.avatarUrl.includes("..")
      ? provider.avatarUrl
      : null;
  return (
    <article className="mm-provider-card">
      <Link href={"/chuyen-vien/" + provider.id} className="mm-provider-main">
        <div className="mm-avatar">
          {safeAvatar ? (
            <Image
              src={safeAvatar}
              width={94}
              height={112}
              alt={"Chân dung " + provider.publicName}
              sizes="94px"
            />
          ) : (
            <span aria-label={"Chưa có ảnh của " + provider.publicName}>
              {initials(provider.publicName)}
            </span>
          )}
        </div>
        <div className="mm-provider-info">
          <span className="mm-verified">
            <CheckCircle2 size={13} /> Hồ sơ được phê duyệt
          </span>
          <h3>{provider.publicName}</h3>
          <p className="mm-provider-title">{provider.title || "Kỹ thuật viên chăm sóc"}</p>
          <div className="mm-provider-facts">
            {provider.yearsExperience != null && (
              <span>
                <Sparkles size={13} /> {provider.yearsExperience} năm kinh nghiệm
              </span>
            )}
            {provider.serviceArea && (
              <span>
                <MapPin size={13} /> {provider.serviceArea}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="mm-tile-arrow" size={18} />
      </Link>
      {provider.eligibleServices && provider.eligibleServices.length > 0 && (
        <div className="mm-service-chips" aria-label="Dịch vụ cung cấp">
          {[...new Set(provider.eligibleServices.map((item) => item.serviceName))]
            .slice(0, 2)
            .map((name) => (
              <span key={name}>{name}</span>
            ))}
        </div>
      )}
      <div className="mm-tile-actions">
        <Link className="mm-subtle-action" href={"/chuyen-vien/" + provider.id}>
          Xem hồ sơ <ArrowUpRight size={16} />
        </Link>
        <Link className="mm-tile-book" href={bookingHref({ provider: provider.id })}>
          Chọn KTV này <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

export function ServiceTile({ item }: { item: ServiceItem }) {
  const variants = item.variants.filter((variant) => variant.isActive);
  const prices = variants
    .map((variant) => Number(variant.priceVnd))
    .filter((value) => Number.isSafeInteger(value) && value >= 0);
  return (
    <article className={"mm-service-card" + (item.isDemo ? " mm-demo-service-card" : "")}>
      <div className={"mm-service-decor" + (item.imageUrl ? " mm-service-photo" : "")}>
        {item.imageUrl ? (
          <picture>
            {item.imageSrcSet && (
              <source
                type="image/webp"
                srcSet={item.imageSrcSet}
                sizes="(max-width: 700px) 95px, 33vw"
              />
            )}
            <Image
              src={item.imageUrl}
              alt={item.imageAlt || "Ảnh dịch vụ " + item.service.name}
              width={680}
              height={400}
              sizes="(max-width: 700px) 95px, 33vw"
              unoptimized={item.isDemo}
            />
          </picture>
        ) : (
          <Flower2 size={26} strokeWidth={1.35} />
        )}
      </div>
      <div className="mm-service-body">
        <span className="mm-overline">THƯ GIÃN & CHĂM SÓC</span>
        <h3>
          <Link href={"/dich-vu/" + encodeURIComponent(item.service.slug)}>
            {item.service.name}
          </Link>
        </h3>
        <p>{item.service.description || "Khám phá các lựa chọn chăm sóc phù hợp cùng Mộc."}</p>
        <div className="mm-service-meta">
          <Clock3 size={15} />{" "}
          {variants.length
            ? [...new Set(variants.map((variant) => variant.durationMinutes))].join(" · ") + " phút"
            : "Thời lượng đang cập nhật"}
        </div>
        <div className="mm-service-bottom">
          <div>
            <small>Giá tham khảo</small>
            <strong>
              {prices.length ? "Từ " + formatPrice(Math.min(...prices)) : "Đang cập nhật"}
            </strong>
          </div>
          <Link
            href={
              item.isDemo
                ? "/dich-vu/" + encodeURIComponent(item.service.slug)
                : bookingHref({ service: item.service.id })
            }
            aria-label={"Chọn dịch vụ " + item.service.name}
            className="mm-round-action"
          >
            <ArrowRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MobileExperience({
  providers,
  services,
  providersUnavailable,
  catalogUnavailable,
  page = "home",
}: Props) {
  useCatalogRealtime();
  const [focus, setFocus] = useState<Focus>(page === "services" ? "services" : "providers");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const isHome = page === "home";
  const activeFocus = page === "services" ? "services" : page === "providers" ? "providers" : focus;

  const serviceTags = useMemo(
    () =>
      [...new Map(services.map((item) => [item.service.id, item.service.name])).entries()].slice(
        0,
        7,
      ),
    [services],
  );
  const normalizedQuery = normalized(query.trim());
  const providerItems = providers.filter((provider) => {
    if (
      filter !== "all" &&
      !provider.eligibleServices?.some((service) => service.serviceId === filter)
    )
      return false;
    return (
      !normalizedQuery ||
      normalized(
        [
          provider.publicName,
          provider.title,
          provider.serviceArea,
          provider.introduction,
          ...(provider.eligibleServices?.map((service) => service.serviceName) || []),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery)
    );
  });
  const serviceItems = services.filter(
    (item) =>
      !normalizedQuery ||
      normalized(
        [
          item.service.name,
          item.service.description,
          ...item.variants.map((variant) => variant.name),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery),
  );
  const filtered = activeFocus === "providers" ? providerItems.length : serviceItems.length;

  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main id="noi-dung" className="mm-main mm-container">
        {isHome ? (
          <section className="mm-welcome">
            <div className="mm-welcome-copy">
              <div className="mm-greeting">
                <span className="mm-greeting-dot" /> CHĂM SÓC MỖI NGÀY, THEO CÁCH CỦA BẠN
              </div>
              <h1>
                Thảnh thơi hơn, <em>từ hôm nay.</em>
              </h1>
              <p>
                Tìm kỹ thuật viên bạn tin tưởng, chọn dịch vụ phù hợp và đặt một khoảng thời gian
                dành riêng cho mình.
              </p>
              <div className="mm-hero-links">
                <Link className="mm-primary-cta" href="/dat-lich">
                  <CalendarDays size={19} /> Đặt lịch ngay <ArrowRight size={18} />
                </Link>
                <Link className="mm-outline-cta" href="/chuyen-vien">
                  Khám phá KTV
                </Link>
              </div>
              <div className="mm-trustline">
                <ShieldCheck size={16} /> Chỉ hiển thị KTV đủ điều kiện và được phê duyệt
              </div>
            </div>
            <div className="mm-welcome-visual">
              <Image
                src="/images/wellness-sanctuary.webp"
                alt="Không gian thư giãn lấy cảm hứng từ thiên nhiên"
                fill
                priority
                sizes="(max-width: 800px) 100vw, 540px"
              />
              <div className="mm-visual-note">
                <Flower2 size={18} /> Một chút chăm sóc, thêm nhiều an yên.
              </div>
            </div>
          </section>
        ) : (
          <section className="mm-page-intro">
            <span className="mm-overline">
              {page === "providers" ? "ĐỘI NGŨ ĐỒNG HÀNH" : "KHÁM PHÁ DỊCH VỤ"}
            </span>
            <h1>
              {page === "providers" ? (
                <>
                  Chọn người <em>bạn tin tưởng.</em>
                </>
              ) : (
                <>
                  Chọn điều <em>cơ thể cần.</em>
                </>
              )}
            </h1>
            <p>
              {page === "providers"
                ? "Xem hồ sơ và dịch vụ được duyệt, sau đó chọn thời gian phù hợp."
                : "Tìm hiểu thời lượng, giá công khai và các KTV đủ điều kiện phục vụ."}
            </p>
          </section>
        )}

        <section className="mm-discover" aria-labelledby="mm-discover-title">
          <div className="mm-section-heading">
            <div>
              <span className="mm-overline">TÌM KIẾM NHANH</span>
              <h2 id="mm-discover-title">Bạn muốn bắt đầu từ đâu?</h2>
            </div>
            {isHome && (
              <Link href="/dat-lich" className="mm-heading-link">
                Đặt lịch <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
          {isHome && (
            <div className="mm-segments" aria-label="Chọn cách khám phá">
              <button
                type="button"
                className={activeFocus === "providers" ? "selected" : ""}
                onClick={() => {
                  setFocus("providers");
                  setQuery("");
                }}
              >
                <Users size={19} /> Chọn KTV trước
              </button>
              <button
                type="button"
                className={activeFocus === "services" ? "selected" : ""}
                onClick={() => {
                  setFocus("services");
                  setQuery("");
                }}
              >
                <HandHeart size={19} /> Chọn dịch vụ trước
              </button>
            </div>
          )}
          <div className="mm-searchbar">
            <Search size={19} />
            <input
              aria-label={
                activeFocus === "providers" ? "Tìm KTV theo tên hoặc kỹ năng" : "Tìm dịch vụ"
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                activeFocus === "providers"
                  ? "Tìm tên KTV, khu vực, dịch vụ..."
                  : "Bạn muốn massage hoặc chăm sóc gì?"
              }
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="mm-clear-search">
                Xóa
              </button>
            )}
            <SlidersHorizontal size={18} className="mm-filter-icon" />
          </div>
          {activeFocus === "providers" && serviceTags.length > 0 && (
            <div className="mm-filters" aria-label="Lọc KTV theo dịch vụ">
              <button
                type="button"
                className={filter === "all" ? "selected" : ""}
                onClick={() => setFilter("all")}
              >
                Tất cả
              </button>
              {serviceTags.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={filter === id ? "selected" : ""}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="mm-results-heading">
            <h3>
              {activeFocus === "providers" ? "Kỹ thuật viên tại Mộc" : "Dịch vụ dành cho bạn"}
            </h3>
            <span>{filtered ? filtered + " kết quả" : "Dữ liệu cập nhật theo thời gian thực"}</span>
          </div>
          {(activeFocus === "providers" ? providersUnavailable : catalogUnavailable) &&
          !filtered ? (
            <div className="mm-empty" role="alert">
              Chưa kết nối được danh sách. Bạn có thể tải lại trang hoặc thử sau.
            </div>
          ) : filtered ? (
            <div className={activeFocus === "providers" ? "mm-provider-grid" : "mm-service-grid"}>
              {activeFocus === "providers"
                ? providerItems
                    .slice(0, isHome ? 6 : undefined)
                    .map((provider) => <ProviderTile key={provider.id} provider={provider} />)
                : serviceItems
                    .slice(0, isHome ? 6 : undefined)
                    .map((service) => <ServiceTile key={service.service.id} item={service} />)}
            </div>
          ) : (
            <div className="mm-empty">
              <span className="mm-empty-icon">
                <Heart size={28} />
              </span>
              <strong>
                {query || filter !== "all"
                  ? "Chưa có kết quả phù hợp"
                  : activeFocus === "providers"
                    ? "Đội ngũ KTV đang được cập nhật"
                    : "Dịch vụ đang được cập nhật"}
              </strong>
              <p>
                {query || filter !== "all"
                  ? "Thử từ khóa khác hoặc mở tất cả danh sách."
                  : activeFocus === "providers"
                    ? "Chỉ những hồ sơ đã duyệt và đủ điều kiện được hiển thị tại đây."
                    : "Các gói sẽ xuất hiện khi được Mộc Maria công bố."}
              </p>
              {(query || filter !== "all") && (
                <button
                  type="button"
                  className="mm-outline-cta"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
          {isHome && filtered > 6 && (
            <Link
              className="mm-see-all"
              href={activeFocus === "providers" ? "/chuyen-vien" : "/dich-vu"}
            >
              Xem tất cả {activeFocus === "providers" ? "KTV" : "dịch vụ"} <ArrowRight size={16} />
            </Link>
          )}
        </section>

        {isHome && (
          <>
            <section className="mm-member-teaser">
              <div className="mm-teaser-icon">
                <Wallet size={24} />
              </div>
              <div>
                <span className="mm-overline">DÀNH RIÊNG CHO BẠN</span>
                <h2>Góc hội viên Mộc Maria</h2>
                <p>
                  Quản lý tài khoản, lịch hẹn và khám phá chương trình khách hàng thân thiết khi
                  được công bố.
                </p>
              </div>
              <Link href="/hoi-vien">
                Tìm hiểu hội viên <ArrowRight size={17} />
              </Link>
            </section>
            <section className="mm-provider-invite">
              <div>
                <span className="mm-overline">ĐỒNG HÀNH CÙNG MỘC</span>
                <h2>Bạn là kỹ thuật viên?</h2>
                <p>Tạo tài khoản, gửi thông tin ứng tuyển và theo dõi tiến trình xét duyệt.</p>
              </div>
              <Link href="/tro-thanh-ktv">
                Đăng ký KTV <ArrowUpRight size={17} />
              </Link>
            </section>
          </>
        )}
      </main>
      <footer className="mm-footer mm-container">
        <span>© 2026 Mộc Maria · Nơi gửi trao sức khỏe</span>
        <div>
          <Link href="/tro-thanh-ktv">Trở thành KTV</Link>
          <Link href="/hoi-vien">Hội viên</Link>
          <a href="https://www.facebook.com/mocmariads" target="_blank" rel="noopener noreferrer">
            Liên hệ
          </a>
        </div>
      </footer>
      <MobileNavigation
        active={isHome ? "home" : page === "providers" ? "providers" : "services"}
      />
    </div>
  );
}
