import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { GiftCounter } from "@/features/gift-events/gift-counter";

export const metadata: Metadata = {
  title: "Quầy xác minh quà | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function GiftCounterPage() {
  return (
    <RequireAuth requiredPermissions={["staff.portal"]}>
      <GiftCounter />
    </RequireAuth>
  );
}
