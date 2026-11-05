import type { Metadata } from "next";
import { CheckInPage } from "@/features/staff-attendance/check-in-page";

export const metadata: Metadata = {
  title: "Check-in nhân viên & KTV",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CheckInPage />;
}
