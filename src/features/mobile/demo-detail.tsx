import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin, Sparkles, UserRound, MessageCircle } from "lucide-react";
import type { Provider } from "@/features/marketplace/types";
import { formatPrice } from "@/features/marketplace/format";
import { MobileHeader, MobileNavigation } from "./experience";
import { officialDemoKtvOffers } from "./official-ktv-offers";
import "./mobile.css";
import { bookingHref, chatHref } from "./links";
import { ProviderRating, ProviderReviews } from "@/features/provider-reviews/reviews";

export function DemoKtvDetail({ provider }: { provider: Provider }) {
  const offers = officialDemoKtvOffers(provider);
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-detail-main">
        <Link href="/" className="mm-back">
          <ArrowLeft size={16} /> Danh sách KTV
        </Link>
        <div className="mm-profile-hero">
          <div className="mm-profile-photo">
            {provider.avatarUrl ? (
              <Image
                src={provider.avatarUrl}
                alt={provider.avatarAlt || "Ảnh đại diện " + provider.publicName}
                width={230}
                height={265}
                unoptimized
              />
            ) : (
              <UserRound size={64} />
            )}
          </div>
          <div className="mm-profile-description">
            <span className="mm-overline">KỸ THUẬT VIÊN MỘC MARIA</span>
            <h1>{provider.publicName}</h1>
            {provider.chatProviderId && <ProviderRating providerId={provider.chatProviderId} />}
            <p className="mm-profile-title">{provider.title}</p>
            <div className="mm-profile-facts">
              {provider.age && <span>{provider.age} tuổi</span>}
              {provider.yearsExperience != null && (
                <span>
                  <Sparkles size={15} /> {provider.yearsExperience} năm kinh nghiệm
                </span>
              )}
              {provider.serviceArea && (
                <span>
                  <MapPin size={15} /> {provider.serviceArea}
                </span>
              )}
            </div>
            <p>{provider.introduction}</p>
            <p className="mm-profile-title">
              {provider.scheduleOpen ? "Đã mở lịch làm việc" : "Chưa mở lịch"}
            </p>
            {provider.chatEnabled && provider.chatProviderId && (
              <div className="mm-profile-cta-row">
                <Link
                  className="mm-profile-cta mm-profile-cta-primary"
                  href={bookingHref({ provider: provider.id })}
                >
                  <CalendarClock size={15} aria-hidden="true" />
                  <span>Yêu cầu đặt lịch</span>
                </Link>
                <Link
                  className="mm-profile-cta mm-profile-cta-secondary"
                  href={chatHref(provider.chatProviderId)}
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  <span>Chat riêng với {provider.publicName}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
        <section className="mm-detail-section" id="lich-lam-viec">
          <h2>Lịch làm việc</h2>
          {provider.scheduleOpen && provider.weeklySchedule ? (
            <p>
              Thứ Hai–thứ Bảy · {provider.weeklySchedule.startsAt}–{provider.weeklySchedule.endsAt}{" "}
              (giờ Việt Nam). Chủ nhật nghỉ.
            </p>
          ) : (
            <p>KTV chưa thiết lập lịch làm việc.</p>
          )}
          <p>
            Gửi yêu cầu hoặc chat để trao đổi thời gian phù hợp. KTV sẽ xác nhận khả năng phục vụ
            trước khi chốt lịch.
          </p>
        </section>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>Kỹ năng chăm sóc</h2>
            <span>{offers.length} dịch vụ</span>
          </div>
          <div className="mm-detail-services">
            {offers.map((service) => (
              <article key={service.id}>
                <div>
                  <span className="mm-overline">THƯ GIÃN & CHĂM SÓC</span>
                  <h3>{service.name}</h3>
                </div>
                <strong>{formatPrice(service.price)}</strong>
                {provider.chatEnabled && provider.chatProviderId && (
                  <Link
                    className="mm-text-link"
                    href={chatHref(provider.chatProviderId, service.demoServiceId)}
                  >
                    <MessageCircle size={16} /> Tư vấn dịch vụ này
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
        {provider.chatProviderId ? (
          <ProviderReviews providerId={provider.chatProviderId} />
        ) : (
          <section
            className="mm-detail-section mm-demo-review-info"
            aria-label="Đánh giá kỹ thuật viên"
          >
            <h2>Đánh giá từ khách hàng</h2>
            <p>
              Chưa thể nhận đánh giá cho hồ sơ này. Lịch dịch vụ cần được xác thực trước khi gửi
              nhận xét.
            </p>
          </section>
        )}
      </main>
      <MobileNavigation active="providers" />
    </div>
  );
}
