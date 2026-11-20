import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { ChatMonitor } from "@/features/marketplace/chat-monitor";
export const metadata: Metadata = {
  title: "Chat monitor · Mộc Maria",
  robots: { index: false, follow: false },
};
export default function ChatMonitorPage() {
  return (
    <AdminShell title="Giám sát chat" permission="customers.manage" showHeading={false}>
      <ChatMonitor />
    </AdminShell>
  );
}
