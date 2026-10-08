import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketShell, CardSkeleton } from "@/features/marketplace/components";
import { ProviderDetails } from "@/features/marketplace/providers";
export const metadata: Metadata = {
  title: "Hồ sơ chuyên viên",
  description: "Giới thiệu và khu vực phục vụ của chuyên viên Mộc Maria.",
};
export default function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <MarketShell title="Người đồng hành trong hành trình an yên." eyebrow="CHUYÊN VIÊN MỘC MARIA">
      <Suspense fallback={<CardSkeleton />}>
        <ProviderDetails params={params} />
      </Suspense>
    </MarketShell>
  );
}
