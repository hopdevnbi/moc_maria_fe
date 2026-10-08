import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { BranchAdmin } from "@/features/marketplace/branch-admin";
export const metadata: Metadata = {
  title: "Cơ sở & tài nguyên",
  robots: { index: false, follow: false },
};
export default function AdminBranchPage() {
  return (
    <AdminShell title="Cơ sở & tài nguyên." permission="staff.manage">
      <BranchAdmin />
    </AdminShell>
  );
}
