import { LocalizedText, LocalizedMenuName } from "@/shared/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { publicServiceSlug } from "@/features/mobile/public-route-ids";
import { ArrowLeft, ArrowRight, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { publicRead } from "@/features/marketplace/public-api";
import { formatPrice } from "@/features/marketplace/format";
import type { Provider, ServiceDetail } from "@/features/marketplace/types";
import { MobileHeader, MobileNavigation, ProviderTile } from "@/features/mobile/experience";
import { bookingHref } from "@/features/mobile/links";
import { DemoServiceDetail } from "@/features/mobile/demo-service-detail";
import demoServices from "@/features/mobile/demo-services.json";
import "@/features/mobile/mobile.css";

export const metadata: Metadata = {
  title: "Chi tiết dịch vụ massage",
  description: "Gói dịch vụ Mộc Maria, thời lượng, giá niêm yết và KTV có thể cung cấp.",
};

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/i.test(slug)) notFound();
  const demo = demoServices.find(
    (item) => item.service.slug === slug || publicServiceSlug(item.service.slug) === slug,
  );
  if (demo) {
    const clean = publicServiceSlug(demo.service.slug);
    if (slug !== clean) permanentRedirect("/dich-vu/" + clean);
    return <DemoServiceDetail item={demo} />;
  }
  const [result, providerResult] = await Promise.all([
    publicRead<ServiceDetail>("/services/" + encodeURIComponent(slug)),
    publicRead<Provider[]>("/providers"),
  ]);
  if (!result.ok && result.status === 404) notFound();
  const detail = result.ok ? result.data : null;
  const eligible =
    detail && providerResult.ok
      ? providerResult.data.filter((provider) =>
          provider.eligibleServices?.some(
            (policy) => policy.serviceId === detail.service.id && policy.mode === "ON_SITE",
          ),
        )
      : [];
  const prices =
    detail?.variants
      .filter((variant) => variant.isActive)
      .map((variant) => Number(variant.priceVnd))
      .filter((value) => Number.isSafeInteger(value) && value >= 0) || [];

  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-detail-main">
        <Link href="/dich-vu" className="mm-back">
          <ArrowLeft size={16} /> <LocalizedText message="detail.list" />
        </Link>
        {!detail ? (
          <div className="mm-empty" role="alert">
            <LocalizedText message="detail.loadError" />
          </div>
        ) : (
          <>
            <section className="mm-service-detail-hero">
              <span className="mm-overline">
                <LocalizedText message="detail.package" />
              </span>
              <h1>
                <LocalizedMenuName name={detail.service.name} />
              </h1>
              <p>{detail.service.description || <LocalizedText message="detail.updating" />}</p>
              <div className="mm-service-detail-price">
                {prices.length ? (
                  <LocalizedText
                    message="detail.priceFrom"
                    values={{ price: formatPrice(Math.min(...prices)) }}
                  />
                ) : (
                  <LocalizedText message="detail.updatingPrice" />
                )}
              </div>
              <Link className="mm-primary-cta" href={bookingHref({ service: detail.service.id })}>
                <LocalizedText message="detail.chooseTime" /> <ArrowRight size={18} />
              </Link>
            </section>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>
                  <LocalizedText message="detail.packages" />
                </h2>
                <span>
                  <LocalizedText message="detail.options" values={{ n: detail.variants.length }} />
                </span>
              </div>
              {detail.variants.filter((variant) => variant.isActive).length ? (
                <div className="mm-detail-services">
                  {detail.variants
                    .filter((variant) => variant.isActive)
                    .map((variant) => (
                      <article key={variant.id}>
                        <div>
                          <h3>
                            <LocalizedMenuName name={variant.name} />
                          </h3>
                          <p>
                            <Clock3 size={15} />{" "}
                            <LocalizedText
                              message="detail.minutes"
                              values={{ n: variant.durationMinutes }}
                            />{" "}
                            · <strong>{formatPrice(variant.priceVnd)}</strong>
                          </p>
                        </div>
                        <Link
                          className="mm-tile-book"
                          href={bookingHref({ service: detail.service.id, variant: variant.id })}
                        >
                          <LocalizedText message="detail.choosePackage" /> <ArrowRight size={16} />
                        </Link>
                      </article>
                    ))}
                </div>
              ) : (
                <div className="mm-empty">
                  <LocalizedText message="detail.noPackage" />
                </div>
              )}
            </section>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>
                  <LocalizedText message="detail.eligible" />
                </h2>
                <span>
                  <LocalizedText message="detail.therapistCount" values={{ n: eligible.length }} />
                </span>
              </div>
              {eligible.length ? (
                <div className="mm-provider-grid">
                  {eligible.map((provider) => (
                    <ProviderTile provider={provider} key={provider.id} />
                  ))}
                </div>
              ) : (
                <div className="mm-empty">
                  <LocalizedText message="detail.noEligible" />
                </div>
              )}
            </section>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>
                  <LocalizedText message="detail.branches" />
                </h2>
              </div>
              {detail.branches.length ? (
                <div className="mm-detail-services">
                  {detail.branches.map(({ branch }) => (
                    <article key={branch.id}>
                      <div>
                        <h3>{branch.name}</h3>
                        <p>
                          <MapPin size={15} /> {branch.address}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mm-empty">
                  <LocalizedText message="detail.branchUpdating" />
                </div>
              )}
            </section>
            <div className="mm-detail-notice">
              <ShieldCheck size={18} /> <LocalizedText message="detail.finalPrice" />
            </div>
          </>
        )}
      </main>
      <MobileNavigation active="services" />
    </div>
  );
}
