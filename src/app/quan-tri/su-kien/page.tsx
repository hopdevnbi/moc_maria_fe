import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { EventConsole } from "@/features/gift-events-admin/event-console";
import { parseEventTab } from "@/features/gift-events-admin/event-tabs";
import { LoadingState } from "@/shared/loading/loading-state";

export const metadata: Metadata = {
  title: "Sự kiện mở hộp quà | Mộc Maria",
  robots: { index: false, follow: false },
};
type EventPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

async function EventConsoleEntry({ searchParams }: EventPageProps) {
  const { tab } = await searchParams;
  return <EventConsole initialTab={parseEventTab(tab)} />;
}

export default function EventsAdminPage({ searchParams }: EventPageProps) {
  return (
    <AdminShell title="Sự kiện & quà tặng." permission="admin.portal">
      <Suspense fallback={<LoadingState compact title="Đang mở quản trị sự kiện…" shape="list" />}>
        <EventConsoleEntry searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
