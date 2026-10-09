import type { Metadata } from "next";
import { MarketShell } from "@/features/marketplace/components";
import { BookingsPortal } from "@/features/marketplace/booking-portal";
export const metadata: Metadata = {
  title: "Lịch hẹn của tôi",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <MarketShell
      title="Dành một khoảng lặng cho mình."
      eyebrow="LỊCH HẸN CỦA TÔI"
      description="Theo dõi yêu cầu và đồng ý báo giá để hoàn tất lịch hẹn."
    >
      <BookingsPortal />
    </MarketShell>
  );
}
