import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/features/marketplace/admin-shell";
export const metadata: Metadata = {
  title: "Quản trị Mộc Maria",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return (
    <AdminShell title="Chăm sóc từng trải nghiệm.">
      <div className="market-grid">
        {[
          {
            href: "/quan-tri/khach-hang",
            title: "Kh?ch h?ng",
            text: "Qu?n l? t?i kho?n, tr?ng th?i ho?t ??ng v? h? s? kh?ch h?ng.",
          },
          {
            href: "/quan-tri/hoi-vien",
            title: "H?i vi?n VIP",
            text: "X?t duy?t VIP, theo d?i h?i vi?n v? c?u h?nh quy?n l?i ch?nh th?c.",
          },
          {
            href: "/quan-tri/dich-vu",
            title: "Dịch vụ & bảng giá",
            text: "Nhập danh mục, gói thời lượng và giá chính thức. Chủ động công bố hoặc tạm ngưng từng gói.",
          },
          {
            href: "/quan-tri/co-so",
            title: "Cơ sở & tài nguyên",
            text: "Quản lý địa chỉ, lịch mở cửa, ngày nghỉ, phòng và thiết bị của từng cơ sở.",
          },
          {
            href: "/quan-tri/ktv",
            title: "Ứng tuyển & đào tạo",
            text: "Xem xét hồ sơ, chỉ định khóa học, ghi nhận đánh giá và cấp chứng nhận nội bộ.",
          },
        ].map((item) => (
          <article className="market-panel" key={item.href}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <Link href={item.href} className="market-button market-button-secondary">
              Mở quản lý
            </Link>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
