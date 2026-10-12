import type { Metadata } from "next";
import { Suspense } from "react";
import { catalogSnapshot } from "@/features/mobile/data";
import { OfficialMenuPage } from "@/features/mobile/official-menu-page";

export const metadata: Metadata = {
  title: "Bảng giá chăm sóc sức khỏe và đồ uống",
  description:
    "Bảng giá chính thức Mộc Maria: 10 dịch vụ chăm sóc, trà thảo mộc, nước ép tươi và detox.",
  alternates: { canonical: "/dich-vu" },
};

async function ServiceList() {
  const data = await catalogSnapshot();
  return (
    <OfficialMenuPage services={data.services} />
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8" role="status">
          Đang tải dịch vụ...
        </main>
      }
    >
      <ServiceList />
    </Suspense>
  );
}
