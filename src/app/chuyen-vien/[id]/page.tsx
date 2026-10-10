import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { publicRead } from "@/features/marketplace/public-api";
import type { Provider, ChatProvider } from "@/features/marketplace/types";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { DemoKtvDetail } from "@/features/mobile/demo-detail";
import demoProfiles from "@/features/mobile/demo-ktvs.json";
import { bookingHref } from "@/features/mobile/links";
import "@/features/mobile/mobile.css";
import { ProviderRating, ProviderReviews } from "@/features/provider-reviews/reviews";
import { approvedDescriptions } from "@/features/mobile/presentation-data";

export const metadata: Metadata = {
  title: "Hồ sơ kỹ thuật viên",
  description:
    "Tìm hiểu kinh nghiệm, khu vực và dịch vụ được phê duyệt của kỹ thuật viên Mộc Maria.",
};

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = demoProfiles.find((item) => item.id === id);
  if (demo) {
    const chat = await publicRead<ChatProvider[]>("/ktv-chat/providers");
    const receiver = chat.ok ? chat.data.find((c) => c.publicAlias === demo.id) : undefined;
    const [presentation] = await approvedDescriptions([
      { ...demo, chatProviderId: receiver?.id, chatEnabled: !!receiver },
    ]);
    return <DemoKtvDetail provider={presentation} />;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await publicRead<Provider>("/providers/" + encodeURIComponent(id));
  if (!result.ok && result.status === 404) notFound();
  const provider = result.ok ? (await approvedDescriptions([result.data]))[0] : null;
  const safeAvatar =
    provider?.avatarUrl?.startsWith("/media/") && !provider.avatarUrl.includes("..")
      ? provider.avatarUrl
      : null;
  const eligible = provider?.eligibleServices || [];
  const uniqueServices = Array.from(
    new Map(
      eligible.filter((item) => item.mode === "ON_SITE").map((item) => [item.policyId, item]),
    ).values(),
  );

  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-detail-main">
        <Link href="/chuyen-vien" className="mm-back">
          <ArrowLeft size={16} /> Danh sách KTV
        </Link>
        {!provider ? (
          <div className="mm-empty" role="alert">
            Chưa tải được hồ sơ KTV. Vui lòng thử lại.
          </div>
        ) : (
          <>
            <div className="mm-profile-hero">
              <div className="mm-profile-photo">
                {safeAvatar ? (
                  <Image
                    src={safeAvatar}
                    alt={"Ảnh đại diện " + provider.publicName}
                    width={230}
                    height={265}
                    sizes="(max-width: 700px) 120px, 230px"
                  />
                ) : (
                  <span>
                    <UserRound size={64} strokeWidth={1.2} />
                  </span>
                )}
              </div>
              <div className="mm-profile-description">
                <span className="mm-verified">
                  <CheckCircle2 size={15} /> Hồ sơ đã được xét duyệt
                </span>
                <h1>{provider.publicName}</h1>
                <ProviderRating providerId={provider.id} />
                <p className="mm-profile-title">{provider.title || "Kỹ thuật viên Mộc Maria"}</p>
                <div className="mm-profile-facts">
                  {provider.yearsExperience != null && (
                    <span>
                      <Sparkles size={16} /> {provider.yearsExperience} năm kinh nghiệm
                    </span>
                  )}
                  {provider.serviceArea && (
                    <span>
                      <MapPin size={16} /> {provider.serviceArea}
                    </span>
                  )}
                </div>
                <p>{provider.introduction || "Thông tin giới thiệu đang được cập nhật."}</p>
                <Link className="mm-primary-cta" href={bookingHref({ provider: provider.id })}>
                  Chọn KTV & đặt lịch <ArrowRight size={18} />
                </Link>
                <Link
                  className="mm-outline-cta"
                  href={"/tin-nhan?provider=" + encodeURIComponent(provider.id)}
                >
                  <MessageCircle size={17} /> Chat với KTV
                </Link>
              </div>
            </div>
            <section className="mm-detail-section">
              <div className="mm-results-heading">
                <h2>Dịch vụ KTV có thể cung cấp</h2>
                <span>{uniqueServices.length} lựa chọn</span>
              </div>
              {uniqueServices.length ? (
                <div className="mm-detail-services">
                  {uniqueServices.map((item) => (
                    <article key={item.policyId}>
                      <div>
                        <span className="mm-overline">PHỤC VỤ TẠI CƠ SỞ</span>
                        <h3>{item.serviceName}</h3>
                        <p>
                          <MapPin size={15} /> {item.branchName}
                        </p>
                      </div>
                      <Link
                        className="mm-tile-book"
                        href={bookingHref({ provider: provider.id, service: item.serviceId })}
                      >
                        Chọn dịch vụ <ArrowRight size={16} />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mm-empty">KTV chưa có dịch vụ đủ điều kiện để mở đặt lịch.</div>
              )}
            </section>
            <ProviderReviews providerId={provider.id} />
            <div className="mm-detail-notice">
              <ShieldCheck size={18} /> Việc phê duyệt hồ sơ và chứng nhận đào tạo nội bộ không thay
              thế giấy phép chuyên ngành. Giờ trống chỉ được xác nhận khi kiểm tra lịch thật.
            </div>
          </>
        )}
      </main>
      <MobileNavigation active="providers" />
    </div>
  );
}
