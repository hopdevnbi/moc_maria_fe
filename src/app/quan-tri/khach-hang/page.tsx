import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { CustomerManagementAdmin } from "@/features/marketplace/customer-management-admin";

export const metadata: Metadata = {
  title: "Quản lý khách hàng | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function CustomersAdminPage() {
  return (
    <AdminShell title="Khách hàng & chăm sóc." permission="customers.manage">
      <CustomerManagementAdmin mode="customers" />
    </AdminShell>
  );
}
