import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { CatalogAdmin } from "@/features/marketplace/catalog-admin";
export const metadata: Metadata = {
  title: "Quản lý dịch vụ & bảng giá",
  robots: { index: false, follow: false },
};
export default function AdminCatalogPage() {
  return (
    <AdminShell title="Dịch vụ & bảng giá." permission="staff.manage">
      <CatalogAdmin />
    </AdminShell>
  );
}
