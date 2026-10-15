import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { GiftReportAdmin } from "@/features/gift-events-admin/gift-report-admin";

export const metadata: Metadata = {
  title: "Đối soát sự kiện | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function ReportPage() {
  return (
    <RequireAuth requiredPermissions={["admin.portal"]}>
      <GiftReportAdmin />
    </RequireAuth>
  );
}
