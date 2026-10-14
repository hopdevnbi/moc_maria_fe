import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { CustomerManagementAdmin } from "@/features/marketplace/customer-management-admin";

export const metadata: Metadata = {
  title: "Quản lý hội viên VIP | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function VipMembersAdminPage() {
  return (
    <AdminShell title="Hội viên VIP." permission="customers.manage">
      <CustomerManagementAdmin mode="vip" />
    </AdminShell>
  );
}
