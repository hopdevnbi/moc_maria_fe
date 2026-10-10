import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { NotificationEmailsAdmin } from "@/features/marketplace/notification-emails-admin";

export const metadata: Metadata = {
  title: "Email nhận thông báo | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function NotificationSettingsPage() {
  return (
    <AdminShell title="Cấu hình email nhận thông báo" permission="roles.manage">
      <NotificationEmailsAdmin />
    </AdminShell>
  );
}
