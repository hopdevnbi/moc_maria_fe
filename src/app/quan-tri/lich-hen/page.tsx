import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AppointmentRequestsAdmin } from "@/features/marketplace/appointment-requests-admin";

export const metadata: Metadata = {
  title: "Lịch đặt & yêu cầu khách hàng | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AdminAppointmentRequestsPage() {
  return (
    <AdminShell title="Lịch đặt & yêu cầu." permission="customers.manage">
      <AppointmentRequestsAdmin />
    </AdminShell>
  );
}
