import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { ZaloBotAdmin } from "@/features/zalo-bot/zalo-bot-admin";

export const metadata: Metadata = {
  title: "Kết nối Bot Zalo | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function ZaloSettingsPage() {
  return (
    <AdminShell title="Bot Zalo Mộc Maria" permission="roles.manage">
      <ZaloBotAdmin />
    </AdminShell>
  );
}
