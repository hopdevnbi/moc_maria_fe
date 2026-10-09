import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Sparkles, UserRound } from "lucide-react";
import type { Provider } from "@/features/marketplace/types";
import { formatPrice } from "@/features/marketplace/format";
import { MobileHeader, MobileNavigation } from "./experience";
import "./mobile.css";

export function DemoKtvDetail({ provider }: { provider: Provider }) {
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
                alt={"Ảnh đại diện " + provider.publicName}
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
            <p className="mm-profile-title">Chưa mở lịch · Chưa mở nhận tin nhắn</p>
          </div>
        </div>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>Dịch vụ chăm sóc</h2>
            <span>{provider.demoServices?.length ?? 0} dịch vụ</span>
          </div>
          <div className="mm-detail-services">
            {(provider.demoServices ?? []).map((service) => (
              <article key={service.id}>
                <div>
                  <span className="mm-overline">THƯ GIÃN & CHĂM SÓC</span>
                  <h3>{service.name}</h3>
                  <p>
                    <Clock3 size={15} /> {service.durationMinutes} phút
                  </p>
                </div>
                <strong>{formatPrice(service.priceVnd)}</strong>
              </article>
            ))}
          </div>
        </section>
      </main>
      <MobileNavigation active="providers" />
    </div>
  );
}
