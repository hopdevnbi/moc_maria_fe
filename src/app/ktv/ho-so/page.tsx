import type { Metadata } from "next";
import { MarketShell } from "@/features/marketplace/components";
import { ApplicationPortal } from "@/features/marketplace/provider-portal";
export const metadata: Metadata = {
  title: "Hồ sơ ứng tuyển của tôi",
  robots: { index: false, follow: false },
};
export default function ApplicationPage() {
  return (
    <MarketShell
      title="Hành trình của bạn tại Mộc."
      eyebrow="HỒ SƠ ỨNG TUYỂN"
      description="Gửi hồ sơ và theo dõi phản hồi, đào tạo và các bước tiếp theo."
    >
      <ApplicationPortal />
    </MarketShell>
  );
}
