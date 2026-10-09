"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import type { Provider, ServiceItem } from "@/features/marketplace/types";
import { formatPrice } from "@/features/marketplace/format";
import { MobileHeader, MobileNavigation } from "./experience";
import { bookingHref } from "./links";
import "./home.css";
import { useCatalogRealtime } from "./useCatalogRealtime";

type HomeProps = {
  providers: Provider[];
  services: ServiceItem[];
  providersUnavailable: boolean;
  catalogUnavailable: boolean;
};
type ServiceOffer = {
  id: string;
  name: string;
  duration: number | null;
  price: number | null;
};

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function providerOffers(provider: Provider, services: ServiceItem[]): ServiceOffer[] {
  if (provider.isDemo) {
    return (provider.demoServices || []).map((item) => ({
      id: item.id,
      name: item.name,
      duration: item.durationMinutes,
      price: item.priceVnd,
    }));
  }
  const byId = new Map(services.map((entry) => [entry.service.id, entry]));
  const unique = new Map<string, ServiceOffer>();
  for (const policy of provider.eligibleServices || []) {
    if (policy.mode !== "ON_SITE" || unique.has(policy.serviceId)) continue;
    const service = byId.get(policy.serviceId);
    if (!service) continue;
    const variants = service.variants.filter((variant) => variant.isActive);
    const prices = variants
      .map((variant) => Number(variant.priceVnd))
      .filter((price) => Number.isSafeInteger(price) && price >= 0);
    unique.set(policy.serviceId, {
      id: policy.serviceId,
      name: service.service.name,
      duration: variants.length
        ? Math.min(...variants.map((variant) => variant.durationMinutes))
        : null,
      price: prices.length ? Math.min(...prices) : null,
    });
  }
  return [...unique.values()];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0] || "")
    .join("")
    .toLocaleUpperCase("vi-VN");
}

function MassageKtvCard({ provider, offers }: { provider: Provider; offers: ServiceOffer[] }) {
  const avatar =
    (provider.avatarUrl?.startsWith("/media/") ||
      (provider.isDemo &&
        (provider.avatarUrl?.startsWith("/demo/ktv/") ||
          provider.avatarUrl?.startsWith(
            "https://giangxa-media-cdn.b-cdn.net/moc-maria/demo-ktv/",
          )))) &&
    !provider.avatarUrl.includes("..")
      ? provider.avatarUrl
      : null;
  const canBook = !provider.isDemo && provider.bookable !== false && offers.length > 0;
  return (
    <article className="ktv-card">
      <div className="ktv-person">
        <Link
          href={"/chuyen-vien/" + provider.id}
          className="ktv-avatar"
          aria-label={"Xem hồ sơ " + provider.publicName}
        >
          {avatar ? (
            <Image
              src={avatar}
              width={88}
              height={100}
              sizes="88px"
              alt={"KTV " + provider.publicName}
              unoptimized={provider.isDemo}
            />
          ) : (
            <span>{initials(provider.publicName)}</span>
          )}
        </Link>
        <div className="ktv-identity">
          {provider.isDemo ? (
            <p className="ktv-demo-badge">HỒ SƠ MINH HỌA</p>
          ) : (
            <p className="ktv-approved">
              <CheckCircle2 size={13} /> KTV đã xác minh
            </p>
          )}
          <Link href={"/chuyen-vien/" + provider.id} className="ktv-name">
            {provider.publicName}
          </Link>
          <p className="ktv-role">{provider.title || "Kỹ thuật viên massage"}</p>
          <div className="ktv-facts">
            {provider.age != null && <span>{provider.age} tuổi</span>}
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
      </div>

      <div className="ktv-offers">
        <div className="ktv-offers-heading">
          <strong>{provider.isDemo ? "Dịch vụ minh họa" : "Dịch vụ massage"}</strong>
          <Link href={"/chuyen-vien/" + provider.id}>
            Tất cả <ArrowRight size={13} />
          </Link>
        </div>
        {offers.length ? (
          <ul className="ktv-offers-list">
            {offers.slice(0, 3).map((item) => (
              <li key={item.id}>
                <div className="ktv-offer-info">
                  <strong>{item.name}</strong>
                  {item.duration != null && (
                    <span>
                      <Clock3 size={12} /> Từ {item.duration} phút
                    </span>
                  )}
                </div>
                <div className="ktv-offer-end">
                  <span>
                    {item.price != null
                      ? (provider.isDemo ? "" : "Từ ") + formatPrice(item.price)
                      : "Liên hệ"}
                  </span>
                  {canBook && (
                    <Link
                      href={bookingHref({ provider: provider.id, service: item.id })}
                      aria-label={"Đặt " + item.name + " với " + provider.publicName}
                    >
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ktv-offers-empty">Chưa có dịch vụ được mở đặt lịch.</p>
        )}
      </div>

      <div className="ktv-card-actions">
        {canBook ? (
          <Link className="ktv-book-btn" href={bookingHref({ provider: provider.id })}>
            <CalendarClock size={17} /> Đặt lịch nhanh <ArrowRight size={16} />
          </Link>
        ) : (
          <span className="ktv-book-btn ktv-disabled">
            <CalendarClock size={17} /> Chưa mở lịch
          </span>
        )}
        {provider.isDemo ? (
          <span className="ktv-chat-btn ktv-demo-disabled" title="Hồ sơ demo không nhận tin nhắn">
            <MessageCircle size={17} /> Chat
          </span>
        ) : (
          <Link
            className="ktv-chat-btn"
            href={"/tin-nhan?provider=" + encodeURIComponent(provider.id)}
            aria-label={"Chat với " + provider.publicName}
          >
            <MessageCircle size={17} /> Chat
          </Link>
        )}
      </div>
    </article>
  );
}

export function KtvFirstHomepage({
  providers,
  services,
  providersUnavailable,
  catalogUnavailable,
}: HomeProps) {
  useCatalogRealtime();
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [showAllFilters, setShowAllFilters] = useState(false);
  const knownOffers = useMemo(
    () => new Map(providers.map((provider) => [provider.id, providerOffers(provider, services)])),
    [providers, services],
  );
  const serviceFilters = useMemo(() => {
    return [
      ...new Map(
        [...knownOffers.values()]
          .flat()
          .map((offer) => [offer.id, { id: offer.id, name: offer.name }]),
      ).values(),
    ];
  }, [knownOffers]);
  const q = normalizeSearch(search.trim());
  const visible = providers.filter((provider) => {
    const offers = knownOffers.get(provider.id) || [];
    if (serviceId && !offers.some((offer) => offer.id === serviceId)) return false;
    if (!q) return true;
    return normalizeSearch(
      [
        provider.publicName,
        provider.title,
        provider.serviceArea,
        ...offers.map((offer) => offer.name),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(q);
  });

  return (
    <div className="mobile-experience ktv-home">
      <MobileHeader />
      <main className="mm-container ktv-home-main">
        <div className="ktv-home-top">
          <div className="ktv-home-heading">
            <span className="ktv-kicker">
              <span /> ĐẶT LỊCH MASSAGE CÙNG MỘC MARIA
            </span>
            <h1>
              Chọn KTV. <em>Đặt lịch ngay.</em>
            </h1>
            <p>
              Xem kỹ thuật viên, dịch vụ và mức giá trước khi đặt. Hoặc trò chuyện để được tư vấn
              phù hợp.
            </p>
          </div>
          <Link href="/dat-lich" className="ktv-top-book">
            <CalendarClock size={17} /> Đặt lịch <ArrowRight size={16} />
          </Link>
        </div>

        <section className="ktv-explore" aria-label="Danh sách kỹ thuật viên massage">
          {providers.some((provider) => provider.isDemo) && (
            <div className="ktv-demo-banner" role="note">
              <strong>Trải nghiệm giao diện với 10 KTV mẫu</strong>
              <span>
                Ảnh, tuổi, kinh nghiệm và giá dịch vụ là dữ liệu giả lập. Hồ sơ mẫu không nhận lịch
                hoặc tin nhắn.
              </span>
            </div>
          )}
          <div className="ktv-search">
            <Search size={20} />
            <input
              type="search"
              aria-label="Tìm KTV hoặc dịch vụ massage"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm KTV, dịch vụ, khu vực..."
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Xóa tìm kiếm">
                <X size={17} />
              </button>
            )}
            <button
              type="button"
              className="ktv-filter-toggle"
              aria-label="Hiển thị bộ lọc dịch vụ"
              onClick={() => setShowAllFilters(!showAllFilters)}
              aria-expanded={showAllFilters}
            >
              <SlidersHorizontal size={19} />
            </button>
          </div>
          {serviceFilters.length > 0 && (
            <div
              className={"ktv-filter-row" + (showAllFilters ? " show-all" : "")}
              aria-label="Lọc theo dịch vụ"
            >
              <button
                type="button"
                className={!serviceId ? "active" : ""}
                onClick={() => setServiceId("")}
              >
                Tất cả KTV
              </button>
              {serviceFilters.map((service) => (
                <button
                  type="button"
                  key={service.id}
                  className={serviceId === service.id ? "active" : ""}
                  onClick={() => setServiceId(service.id)}
                >
                  {service.name}
                </button>
              ))}
            </div>
          )}
          <div className="ktv-list-head">
            <div>
              <span className="ktv-list-overline">CHỌN NGƯỜI ĐỒNG HÀNH</span>
              <h2>Danh sách KTV massage</h2>
            </div>
            <span className="ktv-result-count">
              <Users size={14} /> {visible.length} hồ sơ
            </span>
          </div>
          {(providersUnavailable || catalogUnavailable) && !visible.length ? (
            <div className="ktv-list-empty" role="alert">
              <span className="ktv-empty-icon">
                <Users size={30} />
              </span>
              <h3>Đang kết nối danh sách KTV</h3>
              <p>Chưa lấy được dữ liệu KTV hoặc dịch vụ. Bạn hãy tải lại trang sau ít phút.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="ktv-empty-action"
              >
                Tải lại trang <ArrowRight size={16} />
              </button>
            </div>
          ) : visible.length ? (
            <div className="ktv-home-grid">
              {visible.map((provider) => (
                <MassageKtvCard
                  key={provider.id}
                  provider={provider}
                  offers={knownOffers.get(provider.id) || []}
                />
              ))}
            </div>
          ) : (
            <div className="ktv-list-empty">
              <span className="ktv-empty-icon">
                <Heart size={28} />
              </span>
              <h3>
                {search || serviceId ? "Không tìm thấy KTV phù hợp" : "Chưa có KTV mở nhận lịch"}
              </h3>
              <p>
                {search || serviceId
                  ? "Thử tên KTV hoặc dịch vụ khác."
                  : "Danh sách chỉ hiện KTV đã được duyệt và có thông tin công khai. Mộc đang cập nhật đội ngũ."}
              </p>
              {search || serviceId ? (
                <button
                  type="button"
                  className="ktv-empty-action"
                  onClick={() => {
                    setSearch("");
                    setServiceId("");
                  }}
                >
                  Hiện tất cả KTV <ArrowRight size={16} />
                </button>
              ) : (
                <Link className="ktv-empty-action" href="/tro-thanh-ktv">
                  Đăng ký trở thành KTV <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
        </section>
        <div className="ktv-home-bottom">
          <span>
            <ShieldCheck size={16} /> Hồ sơ KTV được xác minh trước khi công khai.
          </span>
          <Link href="/dich-vu">
            Xem tất cả dịch vụ <ArrowRight size={15} />
          </Link>
        </div>
      </main>
      <MobileNavigation active="home" />
    </div>
  );
}
