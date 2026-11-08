import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Leaf,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { ProviderRating, ProviderReviews } from "@/features/provider-reviews/reviews";
import { formatPrice } from "@/features/marketplace/format";
import type { Provider } from "@/features/marketplace/types";
import { MobileHeader, MobileNavigation } from "./experience";
import { bookingHref, chatHref } from "./links";
import { KtvShowcaseGallery } from "./ktv-showcase-gallery";
import { KtvShowcaseEditorLauncher } from "./ktv-showcase-editor";
import { KtvTipPanel } from "./ktv-tip";
import { EMPTY_KTV_SHOWCASE, KTV_WEEKDAYS, type KtvShowcase } from "./ktv-showcase-types";
import "./mobile.css";
import "./ktv-showcase.css";

export interface KtvDetailOffer {
  id: string;
  name: string;
  price?: number | string | null;
  branchName?: string | null;
  consultationServiceId?: string;
  bookingServiceId?: string;
}

function publicAvatar(src?: string | null): string | null {
  if (!src || src.includes("..")) return null;
  if (/^\/(?:demo\/ktv|media\/ktv)\/[a-z0-9/_-]+\.(?:webp|png|jpe?g)$/i.test(src)) return src;
  if (
    /^https:\/\/giangxa-media-cdn\.b-cdn\.net\/moc-maria\/(?:ktv|staff-avatars)\/[a-z0-9/_-]+\.(?:webp|jpe?g)$/i.test(
      src,
    )
  )
    return src;
  return null;
}

function ScheduleSection({
  showcase,
  canChat,
}: {
  showcase: KtvShowcase;
  canChat: boolean;
}) {
  const isConfigured = showcase.weeklyHours.length > 0;
  const days = [1, 2, 3, 4, 5, 6, 0];
  return (
    <section className="ktv-showcase-section ktv-showcase-schedule" id="lich-lam-viec">
      <div className="ktv-showcase-section-title">
        <div>
          <span className="ktv-showcase-kicker">THỜI GIAN ĐỒNG HÀNH</span>
          <h2>Lịch làm việc</h2>
        </div>
        <span className="ktv-showcase-section-icon" aria-hidden="true">
          <Clock3 size={20} />
        </span>
      </div>
      {isConfigured ? (
        <div className="ktv-showcase-hours-grid">
          {days.map((day) => {
            const hours = showcase.weeklyHours.filter((item) => item.weekday === day);
            return (
              <div
                key={day}
                className={"ktv-showcase-hour " + (!hours.length ? "ktv-showcase-hour-off" : "")}
              >
                <span>{KTV_WEEKDAYS[day]}</span>
                <strong>
                  {hours.length
                    ? hours.map((item) => `${item.startsAt}–${item.endsAt}`).join(" · ")
                    : "Chưa có ca"}
                </strong>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ktv-showcase-schedule-empty">
          <span className="ktv-showcase-schedule-art" aria-hidden="true">
            <CalendarClock size={29} strokeWidth={1.35} />
          </span>
          <div>
            <strong>Trao đổi thời gian phù hợp với bạn</strong>
            <p>
              {canChat
                ? "Kỹ thuật viên chưa công bố lịch cố định. Bạn có thể gửi yêu cầu hoặc nhắn tin để thống nhất thời gian."
                : "Kỹ thuật viên chưa công bố lịch cố định. Vui lòng liên hệ Mộc Maria để biết thêm thông tin."}
            </p>
          </div>
        </div>
      )}
      {showcase.scheduleNote && (
        <p className="ktv-showcase-schedule-note">{showcase.scheduleNote}</p>
      )}
      <p className="ktv-showcase-help-line">
        <CalendarCheck2 size={16} /> Đây là giờ làm việc tham khảo. Lịch hẹn chỉ có hiệu lực sau khi
        Mộc Maria xác nhận.
      </p>
    </section>
  );
}

export function KtvPublicDetail({
  provider,
  profileId,
  offers,
  showcase = EMPTY_KTV_SHOWCASE,
}: {
  provider: Provider;
  profileId: string;
  offers: KtvDetailOffer[];
  showcase?: KtvShowcase;
}) {
  const reviewId = provider.chatProviderId || profileId;
  const canChat = provider.chatEnabled !== false && !!reviewId;
  const introductionOnly = provider.isDemo === true && provider.chatEnabled === false;
  const avatar = publicAvatar(provider.avatarUrl);
  const name = provider.publicName;
  const mainBooking = bookingHref({ provider: profileId });

  return (
    <div className="mobile-experience ktv-showcase-page">
      <MobileHeader />
      <main className="mm-container ktv-showcase-main" id="main">
        <nav aria-label="Điều hướng hồ sơ" className="ktv-showcase-breadcrumb">
          <Link href="/chuyen-vien">
            <ArrowLeft size={16} /> Danh sách kỹ thuật viên
          </Link>
          <span aria-hidden="true">/</span>
          <span>{name}</span>
        </nav>

        <section className="ktv-showcase-hero" aria-labelledby="ktv-profile-name">
          <div className="ktv-showcase-portrait-wrap">
            <div className="ktv-showcase-portrait">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={provider.avatarAlt || `Ảnh kỹ thuật viên ${name}`}
                  width={380}
                  height={460}
                  sizes="(max-width: 540px) 124px, (max-width: 900px) 240px, 300px"
                  unoptimized
                />
              ) : (
                <span
                  className="ktv-showcase-portrait-placeholder"
                  aria-label="Chưa có ảnh chân dung"
                >
                  <UserRound size={74} strokeWidth={1} />
                  <Leaf className="ktv-showcase-leaf" size={32} strokeWidth={1.2} />
                </span>
              )}
            </div>
            <span className="ktv-showcase-photo-mark">
              <Leaf size={13} /> Mộc Maria
            </span>
          </div>

          <div className="ktv-showcase-hero-content">
            <div className="ktv-showcase-hero-topline">
              <span className="ktv-showcase-kicker">
                <Sparkles size={14} /> NGƯỜI ĐỒNG HÀNH CÙNG MỘC
              </span>
              {!introductionOnly && (
                <KtvShowcaseEditorLauncher providerId={profileId} initial={showcase} name={name} />
              )}
            </div>
            <h1 id="ktv-profile-name">{name}</h1>
            {!introductionOnly && (
              <div className="ktv-showcase-rating">
                <ProviderRating providerId={reviewId} />
              </div>
            )}
            <p className="ktv-showcase-profession">
              {showcase.headline || provider.title || "Kỹ thuật viên Mộc Maria"}
            </p>
            <div className="ktv-showcase-facts">
              {provider.serviceArea && (
                <span>
                  <MapPin size={15} />
                  {provider.serviceArea}
                </span>
              )}
              {provider.yearsExperience != null && (
                <span>
                  <Sparkles size={15} />
                  {provider.yearsExperience} năm kinh nghiệm
                </span>
              )}
              {provider.age && (
                <span>
                  <CheckCircle2 size={15} />
                  {provider.age} tuổi
                </span>
              )}
            </div>
            <p className="ktv-showcase-intro">
              {showcase.biography ||
                provider.introduction ||
                "Đồng hành cùng bạn trên hành trình chăm sóc và thư giãn tại Mộc Maria."}
            </p>
            <div className="ktv-showcase-actions">
              {introductionOnly ? (
                <span className="ktv-showcase-action ktv-showcase-action-secondary" aria-disabled="true">
                  <CalendarClock size={18} />
                  <span>Chưa mở nhận lịch</span>
                </span>
              ) : (
                <Link href={mainBooking} className="ktv-showcase-action ktv-showcase-action-primary">
                  <CalendarClock size={18} />
                  <span>Yêu cầu đặt lịch</span>
                  <ArrowUpRight size={17} />
                </Link>
              )}
              {canChat && (
                <Link
                  href={chatHref(reviewId)}
                  className="ktv-showcase-action ktv-showcase-action-secondary"
                >
                  <MessageCircle size={18} />
                  <span>Nhắn tin tư vấn</span>
                </Link>
              )}
            </div>
            <p className="ktv-showcase-hero-footnote">
              <ShieldCheck size={15} /> Mộc Maria hỗ trợ xác nhận thời gian trước khi đặt lịch.
            </p>
          </div>
        </section>

        {!introductionOnly && (
          <KtvTipPanel
            key={profileId}
            providerId={profileId}
            name={name}
            chatHref={canChat ? chatHref(reviewId) : null}
          />
        )}

        {showcase.media.length > 0 && (
          <section className="ktv-showcase-section" id="hinh-anh-video">
            <div className="ktv-showcase-section-title">
              <div>
                <span className="ktv-showcase-kicker">GÓC NHÌN THÂN QUEN</span>
                <h2>Khoảnh khắc cùng Mộc</h2>
              </div>
              <span className="ktv-showcase-section-count">
                {showcase.media.length} ảnh & video
              </span>
            </div>
            <KtvShowcaseGallery media={showcase.media} name={name} />
          </section>
        )}

        <div className="ktv-showcase-lower-grid">
          <ScheduleSection showcase={showcase} canChat={canChat} />
          <aside className="ktv-showcase-aside">
            <span className="ktv-showcase-aside-icon">
              <HeartHandshake size={26} strokeWidth={1.4} />
            </span>
            <span className="ktv-showcase-kicker">CHĂM SÓC TẬN TÂM</span>
            <h2>Lắng nghe để chăm sóc tốt hơn</h2>
            <p>
              Bạn có thể trao đổi trước về nhu cầu, thời gian và dịch vụ phù hợp. Kỹ thuật viên sẽ
              phản hồi khi có thể tiếp nhận.
            </p>
            {canChat && (
              <Link href={chatHref(reviewId)}>
                Trao đổi với {name}
                <ArrowUpRight size={17} />
              </Link>
            )}
          </aside>
        </div>

        <section className="ktv-showcase-section" id="dich-vu">
          <div className="ktv-showcase-section-title">
            <div>
              <span className="ktv-showcase-kicker">CHỌN SỰ CHĂM SÓC PHÙ HỢP</span>
              <h2>Dịch vụ phục vụ</h2>
            </div>
            <span className="ktv-showcase-section-count">{offers.length} dịch vụ</span>
          </div>
          {offers.length ? (
            <div className="ktv-showcase-services">
              {offers.map((offer, index) => (
                <article className="ktv-showcase-service" key={offer.id}>
                  <span className="ktv-showcase-service-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="ktv-showcase-service-copy">
                    <span className="ktv-showcase-service-label">THƯ GIÃN & CHĂM SÓC</span>
                    <h3>{offer.name}</h3>
                    {offer.branchName && (
                      <p>
                        <MapPin size={13} /> {offer.branchName}
                      </p>
                    )}
                  </div>
                  <div className="ktv-showcase-service-action">
                    {offer.price != null && <strong>{formatPrice(offer.price)}</strong>}
                    <Link
                      href={
                        offer.consultationServiceId && canChat
                          ? chatHref(reviewId, offer.consultationServiceId)
                          : bookingHref({ provider: profileId, service: offer.bookingServiceId })
                      }
                    >
                      {offer.consultationServiceId && canChat ? "Tư vấn dịch vụ" : "Gửi yêu cầu"}
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ktv-showcase-services-empty">
              <Leaf size={25} />
              <div>
                <strong>Chưa có dịch vụ mở đặt lịch</strong>
                <p>Liên hệ Mộc Maria để được hỗ trợ lựa chọn dịch vụ phù hợp.</p>
              </div>
            </div>
          )}
        </section>

        {!introductionOnly && (
          <div className="ktv-showcase-review-section">
            <ProviderReviews providerId={reviewId} />
          </div>
        )}
        <div className="ktv-showcase-legal">
          <ShieldCheck size={17} /> Thông tin giới thiệu và lịch tham khảo không thay thế xác nhận
          chuyên môn, điều kiện cung cấp dịch vụ và lịch đặt thực tế.
        </div>
      </main>
      <MobileNavigation active="providers" />
    </div>
  );
}
