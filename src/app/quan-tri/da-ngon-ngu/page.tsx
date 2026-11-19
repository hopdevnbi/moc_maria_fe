import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { CatalogTranslationAdmin } from "@/features/marketplace/catalog-translation-admin";
export const metadata: Metadata = {
  title: "Quản lý bản dịch",
  robots: { index: false, follow: false },
};
export default function TranslationAdminPage() {
  return (
    <AdminShell title="Quản lý bản dịch" permission="staff.manage" showHeading={false}>
      <CatalogTranslationAdmin />
    </AdminShell>
  );
}
