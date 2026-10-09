import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { BookingsPortal } from "@/features/marketplace/booking-portal";
export const metadata: Metadata = {
  title: "Quản lý yêu cầu & báo giá",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <AdminShell title="Yêu cầu & báo giá." permission="roles.manage">
      <BookingsPortal role="ADMIN" />
    </AdminShell>
  );
}
