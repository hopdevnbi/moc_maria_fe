import type { Metadata } from "next";
import { MarketShell } from "@/features/marketplace/components";
import { BookingsPortal } from "@/features/marketplace/booking-portal";
export const metadata: Metadata = {
  title: "Yêu cầu dành cho chuyên viên",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <MarketShell
      title="Chăm sóc bằng sự tận tâm."
      eyebrow="LỊCH HẸN CHUYÊN VIÊN"
      description="Nhận hoặc từ chối yêu cầu được phân cho bạn. Khách sẽ xác nhận báo giá trước khi lịch hoàn tất."
    >
      <BookingsPortal role="PROVIDER" />
    </MarketShell>
  );
}
