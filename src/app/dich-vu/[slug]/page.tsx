import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const demo = demoServices.find((item) => item.service.slug === slug);
  if (demo) return <DemoServiceDetail item={demo} />;
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
          <ArrowLeft size={16} /> Danh sách dịch vụ
        </Link>
        {!detail ? (
          <div className="mm-empty" role="alert">
            Chưa tải được thông tin dịch vụ. Vui lòng thử lại.
          </div>
        ) : (
          <>
            <section className="mm-service-detail-hero">
              <span className="mm-overline">GÓI CHĂM SÓC MỘC MARIA</span>
              <h1>{detail.service.name}</h1>
              <p>
                {detail.service.description ||
                  "Mộc đang cập nhật thông tin chi tiết của dịch vụ này."}
              </p>
              <div className="mm-service-detail-price">
                {prices.length ? "Giá từ " + formatPrice(Math.min(...prices)) : "Giá đang cập nhật"}
              </div>
              <Link className="mm-primary-cta" href={bookingHref({ service: detail.service.id })}>
                Chọn thời gian đặt lịch <ArrowRight size={18} />
              </Link>
            </section>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>Gói chăm sóc & thời lượng</h2>
                <span>{detail.variants.length} lựa chọn</span>
              </div>
              {detail.variants.filter((variant) => variant.isActive).length ? (
                <div className="mm-detail-services">
                  {detail.variants
                    .filter((variant) => variant.isActive)
                    .map((variant) => (
                      <article key={variant.id}>
                        <div>
                          <h3>{variant.name}</h3>
                          <p>
                            <Clock3 size={15} /> {variant.durationMinutes} phút ·{" "}
                            <strong>{formatPrice(variant.priceVnd)}</strong>
                          </p>
                        </div>
                        <Link
                          className="mm-tile-book"
                          href={bookingHref({ service: detail.service.id, variant: variant.id })}
                        >
                          Chọn gói <ArrowRight size={16} />
                        </Link>
                      </article>
                    ))}
                </div>
              ) : (
                <div className="mm-empty">Chưa có gói được mở phục vụ.</div>
              )}
            </section>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>Kỹ thuật viên phù hợp</h2>
                <span>{eligible.length} KTV</span>
              </div>
              {eligible.length ? (
                <div className="mm-provider-grid">
                  {eligible.map((provider) => (
                    <ProviderTile provider={provider} key={provider.id} />
                  ))}
                </div>
              ) : (
                <div className="mm-empty">
                  Chưa có KTV đủ điều kiện công khai để cung cấp dịch vụ này.
                </div>
              )}
            </section>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>Cơ sở cung cấp</h2>
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
                <div className="mm-empty">Cơ sở đang được cập nhật.</div>
              )}
            </section>
            <div className="mm-detail-notice">
              <ShieldCheck size={18} /> Giá cuối cùng được hiển thị theo lịch trống, cơ sở và báo
              giá thực tế trước khi khách xác nhận.
            </div>
          </>
        )}
      </main>
      <MobileNavigation active="services" />
    </div>
  );
}
