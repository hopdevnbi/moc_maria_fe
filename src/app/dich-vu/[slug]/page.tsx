import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketShell, CardSkeleton } from "@/features/marketplace/components";
import { ServiceDetails } from "@/features/marketplace/catalog";
export const metadata: Metadata = {
  title: "Gói chăm sóc Mộc Maria",
  description: "Thông tin gói chăm sóc, thời lượng, giá niêm yết và cơ sở cung cấp.",
};
export default function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <MarketShell title="Dành thời gian chăm sóc chính mình." eyebrow="CHI TIẾT TRẢI NGHIỆM">
      <Suspense fallback={<CardSkeleton />}>
        <ServiceDetails params={params} />
      </Suspense>
    </MarketShell>
  );
}
