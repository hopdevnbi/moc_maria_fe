"use client";

import { menuName } from "@/shared/i18n/menu-names";
import { providerTitle } from "@/shared/i18n/provider-titles";
import { useLocale } from "@/shared/i18n/locale-provider";
import { providerProfileHref } from "./provider-slugs";

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
  Sparkles,
  SlidersHorizontal,
  Users,
  X,
  Leaf,
  ArrowUpRight,
} from "lucide-react";
import type { Provider, ServiceItem } from "@/features/marketplace/types";
import { formatPrice } from "@/features/marketplace/format";
import { MobileHeader, MobileNavigation } from "./experience";
import { bookingHref, chatHref } from "./links";
import "./home.css";
import { useCatalogRealtime } from "./useCatalogRealtime";
import { ProviderRating } from "@/features/provider-reviews/reviews";
import { officialDemoKtvOffers } from "./official-ktv-offers";
import { careMenu } from "./official-menu";
import { BrandLogo } from "./brand-logo";
import { ktvAvatarUrl } from "./ktv-avatar";

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
    return officialDemoKtvOffers(provider);
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
  const { locale, t } = useLocale();
  const avatar = ktvAvatarUrl(provider.avatarUrl, provider.isDemo);
  const canBook = !provider.isDemo && provider.bookable !== false && offers.length > 0;
  return (
    <article className="ktv-card">
      <div className="ktv-person">
        <Link
          href={providerProfileHref(provider)}
          className="ktv-avatar"
          aria-label={t("home.profile", { name: provider.publicName })}
        >
          {avatar ? (
            <Image
              src={avatar}
              width={88}
              height={100}
              sizes="88px"
              alt={provider.avatarAlt || t("home.avatar", { name: provider.publicName })}
              unoptimized={provider.isDemo}
            />
          ) : (
            <span>{initials(provider.publicName)}</span>
          )}
        </Link>
        <div className="ktv-identity">
          {!provider.isDemo && (
            <p className="ktv-approved">
              <CheckCircle2 size={13} /> {t("home.verified")}
            </p>
          )}
          <Link href={providerProfileHref(provider)} className="ktv-name">
            {provider.publicName}
          </Link>
          <p className="ktv-role">{providerTitle(locale, provider.title) || t("home.role")}</p>
          <ProviderRating providerId={provider.id} isDemo={provider.isDemo} />
          <div className="ktv-facts">
            {provider.age != null && <span>{t("home.age", { n: provider.age })}</span>}
            {provider.yearsExperience != null && (
              <span>
                <Sparkles size={13} /> {t("home.experience", { n: provider.yearsExperience })}
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
          <strong>{provider.isDemo ? t("home.skills") : t("home.massage")}</strong>
          <Link href={providerProfileHref(provider)}>
            {t("home.all")} <ArrowRight size={13} />
          </Link>
        </div>
        {offers.length ? (
          <ul className="ktv-offers-list">
            {offers.map((item) => (
              <li key={item.id}>
                <div className="ktv-offer-info">
                  <strong>{menuName(locale, item.name)}</strong>
                  {item.duration != null && (
                    <span>
                      <Clock3 size={12} /> {t("home.duration", { n: item.duration })}
                    </span>
                  )}
                </div>
                <div className="ktv-offer-end">
                  <span>
                    {item.price != null
                      ? provider.isDemo
                        ? formatPrice(item.price)
                        : t("home.from", { price: formatPrice(item.price) })
                      : t("home.contact")}
                  </span>
                  {canBook && (
                    <Link
                      href={bookingHref({ provider: provider.id, service: item.id })}
                      aria-label={t("home.bookService", {
                        service: menuName(locale, item.name),
                        name: provider.publicName,
                      })}
                    >
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ktv-offers-empty">{t("home.noServices")}</p>
        )}
      </div>

      <div className="ktv-card-actions">
        {canBook ? (
          <Link className="ktv-book-btn" href={bookingHref({ provider: provider.id })}>
            <CalendarClock size={17} /> {t("home.quickBook")} <ArrowRight size={16} />
          </Link>
        ) : provider.chatEnabled ? (
          <Link className="ktv-book-btn" href={bookingHref({ provider: provider.id })}>
            <CalendarClock size={17} /> {t("home.requestBook")} <ArrowRight size={16} />
          </Link>
        ) : (
          <span className="ktv-book-btn ktv-disabled">
            <CalendarClock size={17} /> {t("home.closed")}
          </span>
        )}
        {provider.isDemo && !provider.chatEnabled ? (
          <span className="ktv-chat-btn ktv-demo-disabled" title={t("home.chatClosed")}>
            <MessageCircle size={17} /> {t("nav.chat")}
          </span>
        ) : (
          <Link
            className="ktv-chat-btn"
            href={chatHref(provider.chatProviderId || provider.id)}
            aria-label={t("home.chatWith", { name: provider.publicName })}
          >
            <MessageCircle size={17} /> {t("nav.chat")}
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
  const { locale, t } = useLocale();
  useCatalogRealtime();
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [showAllFilters, setShowAllFilters] = useState(false);
  const knownOffers = useMemo(
    () => new Map(providers.map((provider) => [provider.id, providerOffers(provider, services)])),
    [providers, services],
  );
  const serviceFilters = useMemo(() => {
    const filters = [
      ...new Map(
        [...knownOffers.values()]
          .flat()
          .map((offer) => [offer.id, { id: offer.id, name: offer.name }]),
      ).values(),
    ];
    return filters.sort((a, b) => {
      const indexA = careMenu.findIndex((item) => item.slug === a.id);
      const indexB = careMenu.findIndex((item) => item.slug === b.id);
      return (indexA < 0 ? 1000 : indexA) - (indexB < 0 ? 1000 : indexB);
    });
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
        providerTitle(locale, provider.title),
        provider.serviceArea,
        ...offers.flatMap((offer) => [offer.name, menuName(locale, offer.name)]),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(q);
  });

  return (
    <div className="mobile-experience ktv-home">
      <MobileHeader />
      <main className="mm-container ktv-home-main" lang={locale}>
        <section className="ktv-home-top" aria-label="Mộc Maria Wellness Lounge">
          <div className="ktv-home-heading">
            <span className="ktv-kicker">
              <Leaf size={14} /> MỘC MARIA · WELLNESS LOUNGE
            </span>
            <h1>
              {t("home.hero1")}
              <br />
              <em>{t("home.hero2")}</em>
            </h1>
            <p>{t("home.intro")}</p>
            <div className="ktv-hero-actions">
              <a href="#chon-ktv" className="ktv-hero-primary">
                {t("home.choose")} <ArrowRight size={17} />
              </a>
              <Link href="/dich-vu" className="ktv-hero-secondary">
                {t("home.explore")} <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="ktv-hero-note">
              <span>
                <Heart size={13} /> {t("home.personal")}
              </span>
              <span>
                <MessageCircle size={13} /> {t("home.privateChat")}
              </span>
            </div>
          </div>
          <div className="ktv-hero-brand">
            <span className="ktv-hero-orbit" aria-hidden="true" />
            <BrandLogo
              alt="Mộc Maria — Wellness Lounge"
              width={1254}
              height={1254}
              sizes="(max-width: 550px) 140px, 260px"
              priority
              unoptimized
            />
            <span className="ktv-hero-brand-caption">{t("home.peace")}</span>
          </div>
        </section>

        <section id="chon-ktv" className="ktv-explore" aria-label={t("home.directory")}>
          <div className="ktv-search">
            <Search size={20} />
            <input
              type="search"
              aria-label={t("home.searchLabel")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("home.search")}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("home.clearSearch")}
              >
                <X size={17} />
              </button>
            )}
            <button
              type="button"
              className="ktv-filter-toggle"
              aria-label={t("home.showFilters")}
              onClick={() => setShowAllFilters(!showAllFilters)}
              aria-expanded={showAllFilters}
            >
              <SlidersHorizontal size={19} />
            </button>
          </div>
          {serviceFilters.length > 0 && (
            <div
              className={"ktv-filter-row" + (showAllFilters ? " show-all" : "")}
              aria-label={t("home.filter")}
            >
              <button
                type="button"
                className={!serviceId ? "active" : ""}
                onClick={() => setServiceId("")}
              >
                {t("home.allTherapists")}
              </button>
              {serviceFilters.map((service) => (
                <button
                  type="button"
                  key={service.id}
                  className={serviceId === service.id ? "active" : ""}
                  onClick={() => setServiceId(service.id)}
                >
                  {menuName(locale, service.name)}
                </button>
              ))}
            </div>
          )}
          <div className="ktv-list-head">
            <div>
              <span className="ktv-list-overline">{t("home.companion")}</span>
              <h2>{t("home.list")}</h2>
            </div>
            <span className="ktv-result-count">
              <Users size={14} /> {t("home.count", { n: visible.length })}
            </span>
          </div>
          {(providersUnavailable || catalogUnavailable) && !visible.length ? (
            <div className="ktv-list-empty" role="alert">
              <span className="ktv-empty-icon">
                <Users size={30} />
              </span>
              <h3>{t("home.connecting")}</h3>
              <p>{t("home.unavailable")}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="ktv-empty-action"
              >
                {t("home.reload")} <ArrowRight size={16} />
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
              <h3>{search || serviceId ? t("home.noMatch") : t("home.noOpen")}</h3>
              <p>{search || serviceId ? t("home.tryOther") : t("home.updating")}</p>
              {search || serviceId ? (
                <button
                  type="button"
                  className="ktv-empty-action"
                  onClick={() => {
                    setSearch("");
                    setServiceId("");
                  }}
                >
                  {t("home.showAll")} <ArrowRight size={16} />
                </button>
              ) : (
                <Link className="ktv-empty-action" href="/tro-thanh-ktv">
                  {t("home.join")} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
        </section>
        <div className="ktv-home-bottom">
          <span>
            <Users size={16} /> {t("home.learn")}
          </span>
          <Link href="/dich-vu">
            {t("home.seeServices")} <ArrowRight size={15} />
          </Link>
        </div>
      </main>
      <MobileNavigation active="home" />
    </div>
  );
}
