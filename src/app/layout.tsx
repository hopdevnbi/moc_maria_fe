import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import { AppProviders } from "@/app/providers/AppProviders";
import { ChristmasWelcome } from "@/shared/seasonal/christmas-welcome";
import { GoogleAnalytics } from "@/shared/analytics/google-analytics";
import { StartupRecovery } from "@/shared/startup/startup-recovery";
import { IOS_COMPATIBILITY_SCRIPT } from "@/shared/startup/ios-compatibility";
import "./globals.css";
import "@/shared/seasonal/christmas.css";

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
  appleWebApp: {
    capable: true,
    title: "Mộc Maria",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#123f2b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* The compatibility marker is set before React starts on old iOS. */}
        <script
          id="moc-ios-compatibility"
          dangerouslySetInnerHTML={{ __html: IOS_COMPATIBILITY_SCRIPT }}
        />
      </head>
      <body className={`${sans.variable} ${serif.variable} christmas-season`}>
        <ChristmasWelcome />
        <AppProviders>{children}</AppProviders>
        <StartupRecovery />
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        </Suspense>
      </body>
    </html>
  );
}
