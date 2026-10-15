import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { GiftEventAdmin } from "@/features/gift-events-admin/event-admin";
export const metadata: Metadata = {
  title: "Sự kiện mở hộp quà | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function EventsAdminPage() {
  return (
    <AdminShell title="Sự kiện & quà tặng." permission="admin.portal">
      <GiftEventAdmin />
    </AdminShell>
  );
}
