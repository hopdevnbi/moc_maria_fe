import type { Metadata } from "next";
import { MarketShell } from "@/features/marketplace/components";
import { TrainingPortal } from "@/features/marketplace/provider-portal";
export const metadata: Metadata = {
  title: "Đào tạo & chứng nhận của tôi",
  robots: { index: false, follow: false },
};
export default function TrainingPage() {
  return (
    <MarketShell
      title="Học hỏi để chăm sóc tốt hơn."
      eyebrow="ĐÀO TẠO TẠI MỘC"
      description="Theo dõi khóa học được chỉ định, kết quả đánh giá và chứng nhận đào tạo nội bộ của bạn."
    >
      <TrainingPortal />
    </MarketShell>
  );
}
