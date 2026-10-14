import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AppointmentRequestsAdmin } from "@/features/marketplace/appointment-requests-admin";
import { AdminIntakeTools } from "@/features/marketplace/admin-intake-tools";

export const metadata: Metadata = {
  title: "Lịch đặt & yêu cầu khách hàng | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AdminAppointmentRequestsPage() {
  return (
    <AdminShell title="Lịch đặt & yêu cầu." permission="customers.manage">
      <AdminIntakeTools />
      <AppointmentRequestsAdmin />
    </AdminShell>
  );
}
