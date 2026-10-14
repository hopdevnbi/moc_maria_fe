import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { TrainingAdmin } from "@/features/marketplace/training-admin";
import { ProviderDisplayAdmin } from "@/features/provider-display/provider-display-admin";
export const metadata: Metadata = {
  title: "Quản lý kỹ thuật viên",
  robots: { index: false, follow: false },
};
export default function AdminTrainingPage() {
  return (
    <AdminShell title="Quản lý kỹ thuật viên." permission="staff.manage">
      <ProviderDisplayAdmin />
      <details className="pd-training">
        <summary>Hồ sơ, đào tạo & điều kiện nhận lịch</summary>
        <TrainingAdmin />
      </details>
    </AdminShell>
  );
}
