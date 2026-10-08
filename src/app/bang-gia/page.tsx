import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketShell, CardSkeleton } from "@/features/marketplace/components";
import { PriceResults } from "@/features/marketplace/catalog";
export const metadata: Metadata = {
  title: "Bảng giá dịch vụ",
  description: "Giá niêm yết và thời lượng các gói chăm sóc chính thức của Mộc Maria.",
  alternates: { canonical: "/bang-gia" },
};
export default function PricePage() {
  return (
    <MarketShell
      title="Chăm sóc rõ ràng. An tâm lựa chọn."
      eyebrow="BẢNG GIÁ MỘC MARIA"
      description="Các mức giá được công bố trực tiếp từ danh mục dịch vụ. Mọi phụ phí cần được bạn chấp thuận trước khi xác nhận lịch."
    >
      <Suspense fallback={<CardSkeleton />}>
        <PriceResults />
      </Suspense>
    </MarketShell>
  );
}
