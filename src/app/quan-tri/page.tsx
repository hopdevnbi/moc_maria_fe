import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AdminDashboard } from "@/features/marketplace/admin-dashboard";

export const metadata: Metadata = {
  title: "Trung tâm quản trị Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminShell title="Tổng quan điều hành.">
      <AdminDashboard />
    </AdminShell>
  );
}
