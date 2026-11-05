import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AttendanceAdminWorkspace } from "@/features/staff-attendance/attendance-admin-workspace";

export const metadata: Metadata = {
  title: "Chấm công và định vị KTV - Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AttendanceAdminPage() {
  return (
    <AdminShell title="Chấm công & Coin" showHeading={false}>
      <AttendanceAdminWorkspace />
    </AdminShell>
  );
}
