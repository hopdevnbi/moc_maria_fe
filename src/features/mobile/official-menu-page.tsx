"use client";

import Image from "next/image";
import { useLocale } from "@/shared/i18n/locale-provider";
import { menuName } from "@/shared/i18n/menu-names";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Coffee,
  Flower2,
  GlassWater,
  Heart,
  Leaf,
  Search,
  Sparkles,
} from "lucide-react";
import { formatPrice } from "@/features/marketplace/format";
import type { ServiceItem } from "@/features/marketplace/types";
import { bookingHref } from "./links";
import { MobileHeader, MobileNavigation } from "./experience";
import { careMenu, drinkMenu, type MenuItem } from "./official-menu";
import "./official-menu.css";

type Tab = "care" | "drinks";
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function matches(item: MenuItem, search: string) {
  return !search || normalize(item.name + " " + item.description).includes(search);
}
const photoNames: Record<string, string> = {
  "cham-soc-co-vai-gay-chuyen-sau": "neck-ce87c1a1b5b9-960.webp",
  "cham-soc-co-vai-gay-lung-eo": "back-1d0452800a98-960.webp",
  "massage-chan": "foot-732ea1395b88-960.webp",
  "massage-body": "relaxation-c29795f81eb9-960.webp",
  "massage-bau": "/services/official/massage-bau-960.webp",
  "cham-soc-giai-cam": "/services/official/cham-soc-giai-cam-960.webp",
  "combo-giac-hoi-ngai-cuu": "/services/official/combo-giac-hoi-ngai-cuu-960.webp",
  "cham-soc-giac-ngu": "/services/official/cham-soc-giac-ngu-960.webp",
  "cham-soc-vung-dau": "/services/official/cham-soc-vung-dau-960.webp",
  "goi-dau-sach": "hair-be9ed1917a19-960.webp",
};

function CareCard({ item, real }: { item: MenuItem; real?: ServiceItem }) {
  const { locale, t } = useLocale();
  const name = menuName(locale, item.name);
  const canBook = Boolean(
    real?.service.isPublished &&
      real.variants.some((v) => v.isActive && Number(v.priceVnd) === item.priceVnd),
  );
  const photo = photoNames[item.slug];
  const localPhoto = photo?.startsWith("/");
  return (
    <article className="official-care-card">
      <div className="official-care-visual">
        {photo ? (
          <picture>
            {localPhoto && (
              <source
                media="(max-width: 680px)"
                type="image/webp"
                srcSet={photo.replace("-960.webp", "-480.webp")}
              />
            )}
            <Image
              src={
                localPhoto
                  ? photo
                  : "https://giangxa-media-cdn.b-cdn.net/moc-maria/services/photos-v1/" + photo
              }
              alt={t("menu.photo", { name })}
              width={960}
              height={600}
              sizes="(max-width: 680px) 100vw, (max-width: 900px) 50vw, 33vw"
              unoptimized={!localPhoto}
            />
          </picture>
        ) : (
          <div className="official-care-placeholder">
            <Flower2 size={43} strokeWidth={1.15} />
          </div>
        )}
      </div>
      <div className="official-care-info">
        <span className="official-eyebrow">{t("menu.careUpper")}</span>
        <h3>{name}</h3>
        <p>
          {item.description === "Chăm sóc và thư giãn theo bảng giá Mộc Maria."
            ? t("menu.careDescription")
            : item.description === "Thức uống tươi ngon từ menu Mộc Maria."
              ? t("menu.drinkDescription")
              : item.description}
        </p>
        <div className="official-care-bottom">
          <div>
            <small>{t("menu.price")}</small>
            <strong>{formatPrice(item.priceVnd)}</strong>
          </div>
          <Link
            className="official-cta"
            href={canBook ? bookingHref({ service: real!.service.id }) : "/chuyen-vien"}
          >
            {canBook ? t("nav.booking") : t("menu.therapists")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function OfficialMenuPage({ services }: { services: ServiceItem[] }) {
  const { locale, t } = useLocale();
  const [tab, setTab] = useState<Tab>("care");
  const [query, setQuery] = useState("");
  const search = normalize(query.trim());
  const realBySlug = useMemo(() => new Map(services.map((s) => [s.service.slug, s])), [services]);
  const visibleCare = careMenu.filter(
    (item) => matches(item, search) || normalize(menuName(locale, item.name)).includes(search),
  );
  const visibleDrinks = drinkMenu
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => matches(item, search) || normalize(menuName(locale, item.name)).includes(search),
      ),
    }))
    .filter((section) => section.items.length);
  const drinkCount = visibleDrinks.reduce((total, section) => total + section.items.length, 0);
  const count = tab === "care" ? visibleCare.length : drinkCount;

  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main id="noi-dung" className="mm-main mm-container official-menu" lang={locale}>
        <header className="official-intro">
          <span className="official-eyebrow">MỘC MARIA · WELLNESS & CARE</span>
          <h1>
            {t("menu.hero1")} <em>{t("menu.hero2")}</em>
          </h1>
          <p>{t("menu.intro")}</p>
        </header>
        <div className="official-tabs" aria-label={t("menu.tabs")}>
          <button
            type="button"
            aria-pressed={tab === "care"}
            className={tab === "care" ? "selected" : ""}
            onClick={() => {
              setTab("care");
              setQuery("");
            }}
          >
            <Heart size={18} /> {t("menu.services")} <span>{careMenu.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === "drinks"}
            className={tab === "drinks" ? "selected" : ""}
            onClick={() => {
              setTab("drinks");
              setQuery("");
            }}
          >
            <Coffee size={18} /> {t("menu.drinks")}{" "}
            <span>{drinkMenu.reduce((n, section) => n + section.items.length, 0)}</span>
          </button>
        </div>
        <div className="official-search">
          <Search size={19} />
          <input
            aria-label={t("menu.search")}
            placeholder={tab === "care" ? t("menu.searchCare") : t("menu.searchDrinks")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="official-result-heading">
          <div>
            <span className="official-eyebrow">{t("menu.title")}</span>
            <h2>{tab === "care" ? t("menu.care") : t("menu.drinkTitle")}</h2>
          </div>
          <span>{t(tab === "care" ? "menu.serviceCount" : "menu.drinkCount", { n: count })}</span>
        </div>
        {tab === "care" ? (
          <>
            <p className="official-note">
              <Sparkles size={16} /> {t("menu.note")}
            </p>
            <div className="official-care-grid">
              {visibleCare.map((item) => (
                <CareCard key={item.slug} item={item} real={realBySlug.get(item.slug)} />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="official-note">
              <Leaf size={16} /> {t("menu.drinkNote")}
            </p>
            {visibleDrinks.map((section) => (
              <section
                className="official-drink-section"
                key={section.id}
                aria-labelledby={section.id}
              >
                <div className="official-drink-heading">
                  <GlassWater size={24} />
                  <div>
                    <h3 id={section.id}>
                      {section.id === "tra-thao-moc"
                        ? t("menu.herbal")
                        : section.id === "nuoc-ep-tuoi"
                          ? t("menu.juice")
                          : section.title}
                    </h3>
                    <p>
                      {section.id === "tra-thao-moc"
                        ? "69.000đ " + t("menu.perPot")
                        : section.id === "nuoc-ep-tuoi"
                          ? t("menu.fresh")
                          : t("menu.detoxSubtitle")}
                    </p>
                  </div>
                </div>
                <div className="official-drink-grid">
                  {section.items.map((item) => (
                    <div className="official-drink-item" key={item.slug}>
                      <div className="official-drink-leaf">
                        <Leaf size={20} />
                      </div>
                      <div>
                        <h4>{menuName(locale, item.name)}</h4>
                        <p>
                          {item.description === "Chăm sóc và thư giãn theo bảng giá Mộc Maria."
                            ? t("menu.careDescription")
                            : item.description === "Thức uống tươi ngon từ menu Mộc Maria."
                              ? t("menu.drinkDescription")
                              : item.description}
                        </p>
                      </div>
                      <strong>
                        {formatPrice(item.priceVnd)}
                        {section.id === "tra-thao-moc" ? t("menu.perPot") : ""}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
        {!count && <p className="official-no-results">{t("menu.empty")}</p>}
      </main>
      <MobileNavigation active="services" />
    </div>
  );
}
