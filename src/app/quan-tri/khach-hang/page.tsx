import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { VipAdmin } from "@/features/membership/vip-admin";

export const metadata: Metadata = {
  title: "Quản lý khách hàng",
  robots: { index: false, follow: false },
};

export default function AdminCustomerPage() {
  return (
    <AdminShell title="Chăm sóc khách hàng." permission="customers.manage">
      <VipAdmin initialTab="customers" />
    </AdminShell>
  );
}
