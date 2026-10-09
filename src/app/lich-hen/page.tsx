import type { Metadata } from "next";
import AppointmentsPage from "@/features/mobile/appointments";

export const metadata: Metadata = {
  title: "Lịch hẹn của tôi",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AppointmentsPage />;
}
