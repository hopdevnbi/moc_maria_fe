import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { ProviderReviewsAdmin } from "@/features/marketplace/reviews-admin";

export const metadata: Metadata = {
  title: "Kiểm duyệt đánh giá KTV | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AdminKtvReviewsPage() {
  return (
    <AdminShell title="Đánh giá & nhận xét KTV." permission="staff.manage">
      <ProviderReviewsAdmin />
    </AdminShell>
  );
}
