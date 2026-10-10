import type { Metadata } from "next";
import { AdminShell } from "@/features/marketplace/admin-shell";
import { AdminProfile } from "@/features/marketplace/admin-profile";

export const metadata: Metadata = {
  title: "Hồ sơ quản trị viên | Mộc Maria",
  robots: { index: false, follow: false },
};

export default function AdminProfilePage() {
  return (
    <AdminShell title="Hồ sơ quản trị viên.">
      <AdminProfile />
    </AdminShell>
  );
}
