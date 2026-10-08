import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { TrainingAdmin } from "@/features/marketplace/training-admin";
export const metadata: Metadata = {
  title: "Ứng tuyển & đào tạo",
  robots: { index: false, follow: false },
};
export default function AdminTrainingPage() {
  return (
    <AdminShell title="Ứng tuyển & đào tạo." permission="staff.manage">
      <TrainingAdmin />
    </AdminShell>
  );
}
