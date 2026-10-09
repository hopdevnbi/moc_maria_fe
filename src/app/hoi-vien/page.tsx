import type { Metadata } from "next";
import MembershipPage from "@/features/mobile/membership";

export const metadata: Metadata = {
  title: "Hội viên Mộc Maria",
  description:
    "Đăng ký tài khoản khách hàng, xem thông tin hội viên và chương trình VIP Mộc Maria.",
  alternates: { canonical: "/hoi-vien" },
};
export default function Page() {
  return <MembershipPage />;
}
