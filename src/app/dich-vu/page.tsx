import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketShell, CardSkeleton } from "@/features/marketplace/components";
import { ServiceResults } from "@/features/marketplace/catalog";
export const metadata: Metadata = {
  title: "Dịch vụ chăm sóc",
  description: "Khám phá các gói chăm sóc Mộc Maria, thời lượng và giá niêm yết chính thức.",
  alternates: { canonical: "/dich-vu" },
};
export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <MarketShell
      title="Một trải nghiệm dành riêng cho bạn."
      eyebrow="DỊCH VỤ MỘC MARIA"
      description="Lắng nghe cơ thể, chọn một khoảng chăm sóc phù hợp. Mỗi gói được công bố cùng thời lượng và giá niêm yết rõ ràng."
    >
      <Suspense fallback={<CardSkeleton />}>
        <ServiceResults searchParams={searchParams} />
      </Suspense>
    </MarketShell>
  );
}
