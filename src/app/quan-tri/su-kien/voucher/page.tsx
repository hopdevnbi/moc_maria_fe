import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quản lý voucher Event | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function VoucherAdminPage() {
  redirect("/quan-tri/su-kien?tab=vouchers");
}
