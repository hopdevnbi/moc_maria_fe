import Image from "next/image";
import { providerProfileHref } from "./provider-slugs";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import type { ServiceItem } from "@/features/marketplace/types";
import { formatPrice } from "@/features/marketplace/format";
import demoProviders from "./demo-ktvs.json";
import { MobileHeader, MobileNavigation } from "./experience";
import "./mobile.css";

export function DemoServiceDetail({ item }: { item: ServiceItem }) {
  const matching = demoProviders.filter((provider) =>
    provider.demoServices.some((offer) => offer.id === item.service.id),
  );
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-detail-main">
        <Link href="/dich-vu" className="mm-back">
          <ArrowLeft size={16} /> Tất cả dịch vụ
        </Link>
        <div className="mm-detail-notice" role="note">
          <ShieldAlert size={18} />
          Dịch vụ, thời lượng và bảng giá dưới đây là dữ liệu minh họa cho giao diện. Chưa mở đặt
          lịch với dịch vụ mẫu.
        </div>
        <section className="mm-service-detail-hero mm-demo-service-hero">
          {item.imageUrl && (
            <div className="mm-demo-cover">
              <Image
                src={item.imageUrl}
                alt={"Hình minh họa cho " + item.service.name}
                width={680}
                height={400}
                sizes="(max-width: 700px) 100vw, 480px"
                unoptimized
                priority
              />
            </div>
          )}
          <div>
            <span className="mm-overline">DỊCH VỤ MINH HỌA · MỘC MARIA</span>
            <h1>{item.service.name}</h1>
            <p>{item.service.description}</p>
            <p className="mm-service-detail-price">
              Giá từ {formatPrice(Math.min(...item.variants.map((v) => Number(v.priceVnd))))}
            </p>
            <Link href="/dat-lich" className="mm-outline-cta">
              Xem dịch vụ đang mở đặt lịch <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>Thời lượng & giá mẫu</h2>
            <span>{item.variants.length} lựa chọn</span>
          </div>
          <div className="mm-detail-services">
            {item.variants.map((v) => (
              <article key={v.id}>
                <div>
                  <span className="mm-overline">CHƯA MỞ ĐẶT LỊCH</span>
                  <h3>{v.name}</h3>
                  <p>
                    <Clock3 size={15} /> {v.durationMinutes} phút
                  </p>
                </div>
                <strong>{formatPrice(v.priceVnd)}</strong>
              </article>
            ))}
          </div>
        </section>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>KTV minh họa dịch vụ này</h2>
            <span>{matching.length} hồ sơ mẫu</span>
          </div>
          <div className="mm-demo-provider-grid">
            {matching.map((provider) => (
              <Link
                className="mm-demo-provider-tile"
                href={providerProfileHref(provider)}
                key={provider.id}
              >
                <Image
                  src={provider.avatarUrl}
                  width={72}
                  height={86}
                  alt={"Hình minh họa " + provider.publicName}
                  unoptimized
                />
                <div>
                  <span className="mm-overline">KTV MẪU</span>
                  <strong>{provider.publicName}</strong>
                  <small>
                    <Sparkles size={13} /> {provider.yearsExperience} năm kinh nghiệm (mẫu)
                  </small>
                  <small>
                    <MapPin size={13} /> {provider.serviceArea}
                  </small>
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
