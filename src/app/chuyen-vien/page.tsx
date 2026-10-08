import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketShell, CardSkeleton } from "@/features/marketplace/components";
import { ProviderResults } from "@/features/marketplace/providers";
export const metadata: Metadata = {
  title: "Chuyên viên Mộc Maria",
  description: "Tìm hiểu chuyên viên đã hoàn thành đào tạo nội bộ và được Mộc Maria phê duyệt.",
  alternates: { canonical: "/chuyen-vien" },
};
export default function ProvidersPage() {
  return (
    <MarketShell
      title="Chăm sóc bằng sự tận tâm."
      eyebrow="NGƯỜI ĐỒNG HÀNH CÙNG BẠN"
      description="Gặp gỡ những chuyên viên của Mộc. Hồ sơ công khai chỉ được hiển thị sau khi được phê duyệt và có chứng nhận đào tạo nội bộ hợp lệ."
    >
      <Suspense fallback={<CardSkeleton />}>
        <ProviderResults />
      </Suspense>
    </MarketShell>
  );
}
