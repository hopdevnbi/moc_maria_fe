import { LocalizedText, LocalizedMenuName } from "@/shared/i18n/localized-text";
import { providerProfileHref } from "./provider-slugs";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  MapPin,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ServiceItem } from "@/features/marketplace/types";
import type { ChatProvider } from "@/features/marketplace/types";
import { publicRead } from "@/features/marketplace/public-api";
import { chatHref } from "./links";
import { formatPrice } from "@/features/marketplace/format";
import demoProviders from "./demo-ktvs.json";
import { officialKtvProfiles } from "./official-ktv-roster";
import { MobileHeader, MobileNavigation } from "./experience";
import "./mobile.css";
import { officialLegacyCareItem } from "./official-ktv-offers";

export async function DemoServiceDetail({ item }: { item: ServiceItem }) {
  const menuItem = officialLegacyCareItem(item.service.id);
  const name = menuItem?.name || item.service.name;
  const chat = await publicRead<ChatProvider[]>("/ktv-chat/providers");
  const matching = officialKtvProfiles(demoProviders)
    .filter((provider) => provider.demoServices.some((offer) => offer.id === item.service.id))
    .map((p) => ({
      ...p,
      receiver: chat.ok ? chat.data.find((c) => c.publicAlias === p.id) : undefined,
    }))
    .filter((provider) => Boolean(provider.receiver));
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-detail-main">
        <Link href="/dich-vu" className="mm-back">
          <ArrowLeft size={16} /> <LocalizedText message="detail.services" />
        </Link>
        <div className="mm-detail-notice" role="note">
          <ShieldAlert size={18} />
          <LocalizedText message="detail.consultNotice" />
        </div>
        <section className="mm-service-detail-hero mm-demo-service-hero">
          {item.imageUrl && (
            <div className="mm-demo-cover">
              <picture>
                {item.imageSrcSet && (
                  <source
                    type="image/webp"
                    srcSet={item.imageSrcSet}
                    sizes="(max-width: 700px) 100vw, 480px"
                  />
                )}
                <Image
                  src={item.imageUrl}
                  alt={"Ảnh dịch vụ " + name}
                  width={680}
                  height={400}
                  sizes="(max-width: 700px) 100vw, 480px"
                  unoptimized
                  priority
                />
              </picture>
            </div>
          )}
          <div>
            <span className="mm-overline">
              <LocalizedText message="detail.relax" />
            </span>
            <h1>
              <LocalizedMenuName name={name} />
            </h1>
            <p>
              {menuItem?.description === "Chăm sóc và thư giãn theo bảng giá Mộc Maria." ? (
                <LocalizedText message="menu.careDescription" />
              ) : (
                menuItem?.description || item.service.description
              )}
            </p>
            <p className="mm-service-detail-price">
              {menuItem ? (
                <LocalizedText
                  message="detail.price"
                  values={{ price: formatPrice(menuItem.priceVnd) }}
                />
              ) : (
                <LocalizedText
                  message="detail.priceFrom"
                  values={{
                    price: formatPrice(Math.min(...item.variants.map((v) => Number(v.priceVnd)))),
                  }}
                />
              )}
            </p>
            <Link href="/dat-lich" className="mm-outline-cta">
              <LocalizedText message="detail.openServices" /> <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>
              {menuItem ? (
                <LocalizedText message="detail.priceList" />
              ) : (
                <LocalizedText message="detail.durationPrice" />
              )}
            </h2>
            {!menuItem && (
              <span>
                <LocalizedText message="detail.options" values={{ n: item.variants.length }} />
              </span>
            )}
          </div>
          <div className="mm-detail-services">
            {menuItem ? (
              <article>
                <h3>
                  <LocalizedMenuName name={menuItem.name} />
                </h3>
                <strong>{formatPrice(menuItem.priceVnd)}</strong>
              </article>
            ) : (
              item.variants.map((v) => (
                <article key={v.id}>
                  <div>
                    <span className="mm-overline">
                      <LocalizedText message="detail.closedUpper" />
                    </span>
                    <h3>
                      <LocalizedMenuName name={v.name} />
                    </h3>
                    <p>
                      <Clock3 size={15} />{" "}
                      <LocalizedText message="detail.minutes" values={{ n: v.durationMinutes }} />
                    </p>
                  </div>
                  <strong>{formatPrice(v.priceVnd)}</strong>
                </article>
              ))
            )}
          </div>
        </section>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>
              <LocalizedText message="detail.providers" />
            </h2>
            <span>
              <LocalizedText message="home.count" values={{ n: matching.length }} />
            </span>
          </div>
          <div className="mm-demo-provider-grid">
            {matching.map((provider) => (
              <Link
                className="mm-demo-provider-tile"
                href={
                  provider.receiver
                    ? chatHref(provider.receiver.id, item.service.id)
                    : providerProfileHref(provider)
                }
                aria-label={
                  provider.receiver
                    ? "Chat tư vấn " + name + " với " + provider.publicName
                    : "Xem hồ sơ " + provider.publicName
                }
                key={provider.id}
              >
                {provider.receiver?.avatarUrl || provider.avatarUrl ? (
                  <Image
                    src={provider.receiver?.avatarUrl || provider.avatarUrl!}
                    width={72}
                    height={86}
                    alt={provider.avatarAlt || "Ảnh đại diện " + provider.publicName}
                    unoptimized
                  />
                ) : (
                  <UserRound size={48} aria-label={"Chưa có ảnh của " + provider.publicName} />
                )}
                <div>
                  <span className="mm-overline">
                    <LocalizedText message="detail.providerUpper" />
                  </span>
                  <strong>{provider.publicName}</strong>
                  {provider.yearsExperience != null && (
                    <small>
                      <Sparkles size={13} />{" "}
                      <LocalizedText
                        message="home.experience"
                        values={{ n: provider.yearsExperience }}
                      />
                    </small>
                  )}
                  <small>
                    <MapPin size={13} /> {provider.serviceArea}
                  </small>
                  {provider.receiver && (
                    <small>
                      <LocalizedText message="detail.consult" />
                    </small>
                  )}
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <MobileNavigation active="services" />
    </div>
  );
}
