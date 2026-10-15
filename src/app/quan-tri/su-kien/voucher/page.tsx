import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { GiftVouchersAdmin } from "@/features/gift-events-admin/gift-vouchers-admin";

export const metadata: Metadata = {
  title: "Quản lý voucher Event | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function VoucherAdminPage() {
  return (
    <RequireAuth requiredPermissions={["admin.portal"]}>
      <GiftVouchersAdmin />
    </RequireAuth>
  );
}
