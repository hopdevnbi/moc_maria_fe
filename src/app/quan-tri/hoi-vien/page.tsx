import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { VipAdmin } from "@/features/membership/vip-admin";

export const metadata: Metadata = {
  title: "Quản lý khách hàng & Hội viên VIP",
  robots: { index: false, follow: false },
};

export default function AdminMembershipPage() {
  return (
    <AdminShell title="Khách hàng & Hội viên VIP." permission="customers.manage">
      <VipAdmin initialTab="requests" />
    </AdminShell>
  );
}
