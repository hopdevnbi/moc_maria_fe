import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Đối soát sự kiện | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function ReportPage() {
  redirect("/quan-tri/su-kien?tab=report");
}
