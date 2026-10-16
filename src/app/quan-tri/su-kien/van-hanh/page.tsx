import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Vận hành Event | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function GiftEventOperationsPage() {
  redirect("/quan-tri/su-kien?tab=operations");
}
