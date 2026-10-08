import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import { AppProviders } from "@/app/providers/AppProviders";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-wellness-sans",
  display: "swap",
});

const serif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-wellness-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "Mộc Maria - Nơi gửi trao sức khỏe",
    template: "%s | Mộc Maria",
  },
  description:
    "Mộc Maria Wellness Lounge — một khoảng lặng để thả lỏng cơ thể, chăm sóc bản thân và tìm lại sự cân bằng.",
  applicationName: "Mộc Maria",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${serif.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
