import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { NotificationCenter } from "@/features/notifications/notification-center";

export const metadata: Metadata = {
  title: "Trung tâm thông báo",
  robots: { index: false, follow: false },
};
export default function NotificationSettingsPage() {
  return (
    <AdminShell title="Trung tâm thông báo" permission="roles.manage">
      <NotificationCenter />
    </AdminShell>
  );
}
