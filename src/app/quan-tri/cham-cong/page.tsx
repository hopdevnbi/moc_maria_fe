import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { StaffAttendanceAdmin } from "@/features/staff-attendance/staff-attendance-admin";

export const metadata: Metadata = {
  title: "Chấm công và Coin - Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AttendanceAdminPage() {
  return (
    <AdminShell title="Chấm công & Coin" showHeading={false}>
      <StaffAttendanceAdmin />
    </AdminShell>
  );
}
