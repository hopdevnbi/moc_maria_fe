import type { Metadata } from "next";
import { GiftEventLanding } from "@/features/gift-events/gift-event-landing";

export const metadata: Metadata = {
  title: "Giáng sinh an lành · Mở quà yêu thương",
  description:
    "Đón mùa Noel cùng Mộc Maria. Chọn hộp quà Giáng sinh, xem thể lệ và lưu giữ những phần quà trong ví cá nhân.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Mộc Maria",
    url: "https://event.mocmaria.com/",
    title: "Giáng sinh an lành | Mộc Maria",
    description: "Mở hộp quà, nhận yêu thương. Những lời tri ân dành cho khách hàng Mộc Maria.",
    images: [
      {
        url: "https://giangxa-media-cdn.b-cdn.net/moc-maria/event/social/christmas-share-825c92205b81.jpg",
        secureUrl: "https://giangxa-media-cdn.b-cdn.net/moc-maria/event/social/christmas-share-825c92205b81.jpg",
        type: "image/jpeg",
        width: 1200,
        height: 630,
        alt: "Giáng sinh an lành · Mở quà yêu thương cùng Mộc Maria",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Giáng sinh an lành | Mộc Maria",
    description: "Mở hộp quà, nhận yêu thương. Những lời tri ân dành cho khách hàng Mộc Maria.",
    images: ["https://giangxa-media-cdn.b-cdn.net/moc-maria/event/social/christmas-share-825c92205b81.jpg"],
  },
  alternates: { canonical: "https://event.mocmaria.com/" },
};

export default function EventPage() {
  return <GiftEventLanding />;
}
