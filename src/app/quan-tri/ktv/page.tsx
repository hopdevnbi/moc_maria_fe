import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { TrainingAdmin } from "@/features/marketplace/training-admin";
export const metadata: Metadata = {
  title: "Quản lý kỹ thuật viên",
  robots: { index: false, follow: false },
};
export default function AdminTrainingPage() {
  return (
    <AdminShell title="Quản lý kỹ thuật viên." permission="staff.manage">
      <TrainingAdmin />
    </AdminShell>
  );
}
