import type { Metadata } from "next";
import { Suspense } from "react";
import { catalogSnapshot } from "@/features/mobile/data";
import { OfficialMenuPage } from "@/features/mobile/official-menu-page";
import { PublicPageLoading } from "@/shared/loading/public-page-loading";

export const metadata: Metadata = {
  title: "Bảng giá chăm sóc sức khỏe và đồ uống",
  description:
    "Bảng giá chính thức Mộc Maria: 10 dịch vụ chăm sóc, trà thảo mộc, nước ép tươi và detox.",
  alternates: { canonical: "/dich-vu" },
};

async function ServiceList() {
  const data = await catalogSnapshot();
  return <OfficialMenuPage services={data.services} />;
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <PublicPageLoading
          page="services"
          title="Chọn một khoảng nghỉ cho mình"
          description="Đang cập nhật dịch vụ, thời lượng và bảng giá của Mộc Maria."
        />
      }
    >
      <ServiceList />
    </Suspense>
  );
}
