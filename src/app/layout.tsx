import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/app/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "Mộc Maria - Nơi gửi trao sức khỏe",
    template: "%s | Mộc Maria",
  },
  description:
    "Nền tảng wellness của Mộc Maria dành cho đặt lịch, chăm sóc sức khỏe và kết nối cùng chuyên viên.",
  applicationName: "Mộc Maria",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
