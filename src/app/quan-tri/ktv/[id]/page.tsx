import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AdminKtvDetail } from "@/features/marketplace/ktv-admin-detail";

export const metadata: Metadata = {
  title: "Chi tiết KTV - Quản trị Mộc Maria",
  robots: { index: false, follow: false },
};
export default async function AdminKtvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  return (
    <AdminShell title="Chi tiết kỹ thuật viên." permission="staff.manage">
      <AdminKtvDetail id={id} />
    </AdminShell>
  );
}
