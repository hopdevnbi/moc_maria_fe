import type { Metadata } from "next";
import { Suspense } from "react";
import { publicMarketplace } from "@/features/mobile/data";
import { MobileExperience } from "@/features/mobile/experience";

export const metadata: Metadata = {
  title: "Dịch vụ massage và chăm sóc",
  description:
    "Chọn dịch vụ massage, thời lượng, bảng giá công khai và kỹ thuật viên đáp ứng điều kiện.",
  alternates: { canonical: "/dich-vu" },
};

async function ServiceList() {
  const data = await publicMarketplace();
  return <MobileExperience {...data} page="services" />;
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
