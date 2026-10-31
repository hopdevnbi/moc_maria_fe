import type { Metadata } from "next";
import { GiftEventLanding } from "@/features/gift-events/gift-event-landing";

export const metadata: Metadata = {
  title: "Giáng sinh an lành · Mở quà yêu thương",
  description:
    "Đón mùa Noel cùng Mộc Maria. Chọn hộp quà Giáng sinh, xem thể lệ và lưu giữ những phần quà trong ví cá nhân.",
  openGraph: {
    title: "Giáng sinh an lành | Mộc Maria",
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
