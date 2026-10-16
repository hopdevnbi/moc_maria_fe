import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { EventConsole, eventTabs, type EventTab } from "@/features/gift-events-admin/event-console";

export const metadata: Metadata = {
  title: "Sự kiện mở hộp quà | Mộc Maria",
  robots: { index: false, follow: false },
};
export default async function EventsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = eventTabs.includes(tab as EventTab) ? (tab as EventTab) : "campaign";
  return (
    <AdminShell title="Sự kiện & quà tặng." permission="admin.portal">
      <EventConsole initialTab={initialTab} />
    </AdminShell>
  );
}
