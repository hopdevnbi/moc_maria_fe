"use client";
import Image from "next/image";
import { useLocale } from "@/shared/i18n/locale-provider";
import { menuName } from "@/shared/i18n/menu-names";
import { useShowcaseTranslation } from "@/shared/i18n/use-showcase-translation";
import { useCatalogTranslations } from "@/shared/i18n/use-catalog-translation";
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
    ) ||
    /^https:\/\/giangxa-media-cdn\.b-cdn\.net\/moc-maria\/provider-showcase\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(
      src,
    )
  )
    return src;
  return null;
}

function ScheduleSection({ showcase, canChat }: { showcase: KtvShowcase; canChat: boolean }) {
  const { locale, t } = useLocale();
  const isConfigured = showcase.weeklyHours.length > 0;
  const days = [1, 2, 3, 4, 5, 6, 0];
  return (
    <section className="ktv-showcase-section ktv-showcase-schedule" id="lich-lam-viec">
      <div className="ktv-showcase-section-title">
        <div>
          <span className="ktv-showcase-kicker">{t("profile.scheduleKicker")}</span>
          <h2>{t("profile.schedule")}</h2>
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
                <span>
                  {locale === "vi"
                    ? KTV_WEEKDAYS[day]
                    : new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
                        new Date(Date.UTC(2024, 0, 7 + day)),
                      )}
                </span>
                <strong>
                  {hours.length
                    ? hours.map((item) => `${item.startsAt}–${item.endsAt}`).join(" · ")
                    : t("profile.noShift")}
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
            <strong>{t("profile.arrange")}</strong>
            <p>{canChat ? t("profile.scheduleChat") : t("profile.scheduleContact")}</p>
          </div>
        </div>
      )}
      {showcase.scheduleNote && (
        <p className="ktv-showcase-schedule-note">{showcase.scheduleNote}</p>
      )}
      <p className="ktv-showcase-help-line">
        <CalendarCheck2 size={16} /> {t("profile.scheduleNote")}
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
  const { locale, t } = useLocale();
  const reviewId = provider.chatProviderId || profileId;
  const canChat = provider.chatEnabled !== false && !!reviewId;
  const introductionOnly = provider.isDemo === true && provider.chatEnabled === false;
  const avatar = publicAvatar(provider.avatarUrl);
  const name = provider.publicName;
  const mainBooking = bookingHref({ provider: profileId });
  const translation = useShowcaseTranslation(profileId, !introductionOnly && showcase.version > 0);
  const services = useCatalogTranslations(
    "service",
    offers.flatMap((offer) => (offer.bookingServiceId ? [offer.bookingServiceId] : [])),
  );

  return (
    <div className="mobile-experience ktv-showcase-page">
      <MobileHeader />
      <main className="mm-container ktv-showcase-main" id="main">
        <nav aria-label={t("profile.breadcrumb")} className="ktv-showcase-breadcrumb">
          <Link href="/chuyen-vien">
            <ArrowLeft size={16} /> {t("profile.list")}
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
                  alt={provider.avatarAlt || t("home.avatar", { name })}
                  width={380}
                  height={460}
                  sizes="(max-width: 540px) 124px, (max-width: 900px) 240px, 300px"
                  unoptimized
                />
              ) : (
                <span
                  className="ktv-showcase-portrait-placeholder"
                  aria-label={t("profile.noPhoto")}
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
                <Sparkles size={14} /> {t("profile.companion")}
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
              {translation?.headline || showcase.headline || provider.title || t("profile.role")}
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
                  {t("home.experience", { n: provider.yearsExperience })}
                </span>
              )}
              {provider.age && (
                <span>
                  <CheckCircle2 size={15} />
                  {t("home.age", { n: provider.age })}
                </span>
              )}
            </div>
            <p className="ktv-showcase-intro">
              {translation?.biography ||
                showcase.biography ||
                provider.introduction ||
                t("profile.intro")}
            </p>
            <div className="ktv-showcase-actions">
              {introductionOnly ? (
                <span
                  className="ktv-showcase-action ktv-showcase-action-secondary"
                  aria-disabled="true"
                >
                  <CalendarClock size={18} />
                  <span>{t("profile.closed")}</span>
                </span>
              ) : (
                <Link
                  href={mainBooking}
                  className="ktv-showcase-action ktv-showcase-action-primary"
                >
                  <CalendarClock size={18} />
                  <span>{t("home.requestBook")}</span>
                  <ArrowUpRight size={17} />
                </Link>
              )}
              {canChat && (
                <Link
                  href={chatHref(reviewId)}
                  className="ktv-showcase-action ktv-showcase-action-secondary"
                >
                  <MessageCircle size={18} />
                  <span>{t("profile.chat")}</span>
                </Link>
              )}
            </div>
            <p className="ktv-showcase-hero-footnote">
              <ShieldCheck size={15} /> {t("profile.confirm")}
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
                <span className="ktv-showcase-kicker">{t("profile.mediaKicker")}</span>
                <h2>{t("profile.media")}</h2>
              </div>
              <span className="ktv-showcase-section-count">
                {t("profile.mediaCount", { n: showcase.media.length })}
              </span>
            </div>
            <KtvShowcaseGallery media={showcase.media} name={name} />
          </section>
        )}

        <div className="ktv-showcase-lower-grid">
          <ScheduleSection
            showcase={{
              ...showcase,
              scheduleNote: translation?.scheduleNote || showcase.scheduleNote,
            }}
            canChat={canChat}
          />
          <aside className="ktv-showcase-aside">
            <span className="ktv-showcase-aside-icon">
              <HeartHandshake size={26} strokeWidth={1.4} />
            </span>
            <span className="ktv-showcase-kicker">{t("profile.careKicker")}</span>
            <h2>{t("profile.listen")}</h2>
            <p>{t("profile.careBody")}</p>
            {canChat && (
              <Link href={chatHref(reviewId)}>
                {t("profile.talk", { name })}
                <ArrowUpRight size={17} />
              </Link>
            )}
          </aside>
        </div>

        <section className="ktv-showcase-section" id="dich-vu">
          <div className="ktv-showcase-section-title">
            <div>
              <span className="ktv-showcase-kicker">{t("profile.selectCare")}</span>
              <h2>{t("profile.services")}</h2>
            </div>
            <span className="ktv-showcase-section-count">
              {t("menu.serviceCount", { n: offers.length })}
            </span>
          </div>
          {offers.length ? (
            <div className="ktv-showcase-services">
              {offers.map((offer, index) => (
                <article className="ktv-showcase-service" key={offer.id}>
                  <span className="ktv-showcase-service-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="ktv-showcase-service-copy">
                    <span className="ktv-showcase-service-label">{t("profile.relax")}</span>
                    <h3>
                      {services[offer.bookingServiceId ?? ""]?.name ?? menuName(locale, offer.name)}
                    </h3>
                    {offer.branchName && (
                      <p>
                        <MapPin size={13} /> {offer.branchName}
                      </p>
                    )}
                  </div>
                  <div className="ktv-showcase-service-action">
                    {offer.price != null && <strong>{formatPrice(offer.price)}</strong>}
                    {introductionOnly ? (
                      <span className="ktv-showcase-service-unavailable">
                        {t("profile.closed")}
                      </span>
                    ) : (
                      <Link
                        href={
                          offer.consultationServiceId && canChat
                            ? chatHref(reviewId, offer.consultationServiceId)
                            : bookingHref({ provider: profileId, service: offer.bookingServiceId })
                        }
                      >
                        {offer.consultationServiceId && canChat
                          ? t("profile.consult")
                          : t("profile.request")}
                        <ArrowUpRight size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ktv-showcase-services-empty">
              <Leaf size={25} />
              <div>
                <strong>{t("profile.noServices")}</strong>
                <p>{t("profile.contact")}</p>
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
          <ShieldCheck size={17} /> {t("profile.legal")}
        </div>
      </main>
      <MobileNavigation active="providers" />
    </div>
  );
}
