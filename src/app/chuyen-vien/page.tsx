import type { Metadata } from "next";
import { Suspense } from "react";
import { publicMarketplace } from "@/features/mobile/data";
import { MobileExperience } from "@/features/mobile/experience";

export const metadata: Metadata = {
  title: "Danh sách Kỹ thuật viên",
  description:
    "Khám phá KTV Mộc Maria đã được phê duyệt, xem kinh nghiệm và chọn dịch vụ để đặt lịch.",
  alternates: { canonical: "/chuyen-vien" },
};

async function ProviderList() {
  const data = await publicMarketplace();
  return <MobileExperience {...data} page="providers" />;
}

export default function ProvidersPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8" role="status">
          Đang tải danh sách kỹ thuật viên...
        </main>
      }
    >
      <ProviderList />
    </Suspense>
  );
}
