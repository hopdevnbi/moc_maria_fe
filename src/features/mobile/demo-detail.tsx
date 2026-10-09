import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, ShieldAlert, Sparkles, UserRound } from "lucide-react";
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
        <div className="mm-detail-notice" role="note">
          <ShieldAlert size={18} /> Hồ sơ, ảnh và giá trong trang này chỉ nhằm minh họa giao diện.
          Đây không phải kỹ thuật viên đang nhận đặt lịch.
        </div>
        <div className="mm-profile-hero">
          <div className="mm-profile-photo">
            {provider.avatarUrl ? (
              <Image
                src={provider.avatarUrl}
                alt={"Ảnh minh họa của " + provider.publicName}
                width={230}
                height={265}
                unoptimized
              />
            ) : (
              <UserRound size={64} />
            )}
          </div>
          <div className="mm-profile-description">
            <span className="mm-verified">HỒ SƠ MINH HỌA</span>
            <h1>{provider.publicName}</h1>
            <p className="mm-profile-title">{provider.title}</p>
            <div className="mm-profile-facts">
              {provider.age && <span>{provider.age} tuổi</span>}
              {provider.yearsExperience != null && (
                <span>
                  <Sparkles size={15} /> {provider.yearsExperience} năm kinh nghiệm (mẫu)
                </span>
              )}
              {provider.serviceArea && (
                <span>
                  <MapPin size={15} /> {provider.serviceArea}
                </span>
              )}
            </div>
            <p>{provider.introduction}</p>
          </div>
        </div>
        <section className="mm-detail-section">
          <div className="mm-results-heading">
            <h2>Các dịch vụ mẫu</h2>
            <span>{provider.demoServices?.length ?? 0} dịch vụ</span>
          </div>
          <div className="mm-detail-services">
            {(provider.demoServices ?? []).map((service) => (
              <article key={service.id}>
                <div>
                  <span className="mm-overline">DỮ LIỆU MINH HỌA</span>
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
