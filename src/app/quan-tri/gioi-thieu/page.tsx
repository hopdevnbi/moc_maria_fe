import { AdminShell } from "@/features/marketplace/admin-shell";
import { ReferralAdmin } from "@/features/referrals/referrals";
export default function ReferralAdminPage() {
  return (
    <AdminShell title="Quản lý giới thiệu" showHeading={false}>
      <ReferralAdmin />
    </AdminShell>
  );
}
