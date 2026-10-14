import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AccessAdmin } from "@/features/access-admin/access-admin";

export const metadata: Metadata = {
  title: "Phân quyền & tài khoản | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AccessAdminPage() {
  return (
    <AdminShell title="Phân quyền & bảo mật." permission="roles.manage">
      <AccessAdmin />
    </AdminShell>
  );
}
