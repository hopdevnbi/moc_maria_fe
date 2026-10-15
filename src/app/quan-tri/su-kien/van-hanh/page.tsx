import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { GiftOperationsAdmin } from "@/features/gift-events-admin/gift-operations-admin";

export const metadata: Metadata = {
  title: "Vận hành Event | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function GiftEventOperationsPage() {
  return (
    <RequireAuth requiredPermissions={["admin.portal"]}>
      <GiftOperationsAdmin />
    </RequireAuth>
  );
}
