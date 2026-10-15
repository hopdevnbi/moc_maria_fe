import type { Metadata } from "next";
import { GiftEventLanding } from "@/features/gift-events/gift-event-landing";

export const metadata: Metadata = {
  title: "Mở hộp quà - Nhận yêu thương | Mộc Maria",
  description:
    "Khu vườn quà An Nhiên của Mộc Maria: xem thể lệ, hạng hội viên và các phần quà đã nhận trong ví cá nhân.",
  openGraph: {
    title: "Khu vườn quà An Nhiên | Mộc Maria",
    description: "Mở hộp quà, nhận yêu thương. Những lời tri ân dành cho khách hàng Mộc Maria.",
    images: [
      {
        url: "/event/gift-boxes/gift-1-640.webp",
        width: 640,
        height: 640,
        alt: "Hộp quà Mộc Maria",
      },
    ],
  },
  alternates: { canonical: "/event" },
};

export default function EventPage() {
  return <GiftEventLanding />;
}
