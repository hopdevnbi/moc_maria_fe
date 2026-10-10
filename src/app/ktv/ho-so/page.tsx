import type { Metadata } from "next";
import { MarketShell } from "@/features/marketplace/components";
import { ApplicationPortal } from "@/features/marketplace/provider-portal";
import { ProviderDescriptionEditor } from "@/features/mobile/profile-editor";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import "@/features/mobile/account.css";
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
      <RequireAuth>
        <ProviderDescriptionEditor />
      </RequireAuth>
      <ApplicationPortal />
    </MarketShell>
  );
}
