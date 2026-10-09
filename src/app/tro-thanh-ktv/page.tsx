import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import "@/features/mobile/mobile.css";

export const metadata: Metadata = {
  title: "Đăng ký trở thành KTV Mộc Maria",
  description:
    "Tạo tài khoản ứng tuyển, gửi thông tin kinh nghiệm và theo dõi xét duyệt KTV Mộc Maria.",
  alternates: { canonical: "/tro-thanh-ktv" },
};

const steps = [
  {
    title: "Gửi hồ sơ cá nhân",
    detail: "Đăng ký tài khoản, khai báo tên hiển thị, kinh nghiệm và khu vực mong muốn phục vụ.",
  },
  {
    title: "Mộc kiểm tra và đánh giá",
    detail: "Hồ sơ chờ quản trị viên xét duyệt, xác minh và đào tạo theo quy trình.",
  },
  {
    title: "Mở dịch vụ phù hợp",
    detail: "Chỉ hồ sơ và dịch vụ đủ điều kiện mới được hiển thị trong danh sách KTV.",
  },
];

export default function ApplyPage() {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-application-section">
        <Link className="mm-back" href="/chuyen-vien">
          <ArrowLeft size={16} /> Quay lại danh sách KTV
        </Link>
        <span className="mm-overline">GIA NHẬP ĐỘI NGŨ MỘC MARIA</span>
        <h1>
          Bắt đầu hành trình <em>cùng Mộc.</em>
        </h1>
        <p>
          Đăng ký thông tin kỹ thuật viên ngay trên điện thoại. Mộc sẽ xem xét, hướng dẫn các bước
          tiếp theo trước khi cho phép nhận lịch phục vụ.
        </p>
        <div className="mm-application-steps">
          {steps.map((item, index) => (
            <article key={item.title}>
              <span>0{index + 1}</span>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
        <section className="mm-application-actions">
          <h2>Đã sẵn sàng đăng ký?</h2>
          <p>
            Nếu bạn chưa có tài khoản, hãy tạo tài khoản trước. Nếu đã đăng nhập, có thể gửi hồ sơ
            ứng tuyển hoặc xem kết quả xét duyệt ngay.
          </p>
          <div className="mm-hero-links">
            <Link href="/ktv/ho-so" className="mm-primary-cta">
              Đăng ký / Xem hồ sơ KTV <ArrowRight size={18} />
            </Link>
            <Link href="/dang-ky" className="mm-outline-cta">
              Tạo tài khoản mới
            </Link>
          </div>
        </section>
        <div className="mm-detail-notice" style={{ marginTop: 20 }}>
          <ShieldCheck size={18} /> Đào tạo và chứng nhận nội bộ Mộc Maria không thay thế điều kiện
          hành nghề do pháp luật quy định. Hồ sơ chưa được duyệt sẽ không được hiển thị cho khách.
        </div>
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
