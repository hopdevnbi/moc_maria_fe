"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Crown,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import "@/features/mobile/mobile.css";

export default function MembershipPage() {
  const { user, status } = useAuth();
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-members-main">
        <div className="mm-members-hero">
          <span className="mm-overline">KHÁCH HÀNG THÂN THIẾT MỘC MARIA</span>
          <h1>
            Dành riêng cho <em>bạn.</em>
          </h1>
          <p>
            Tạo tài khoản để quản lý lịch hẹn, lưu thông tin và theo dõi các chương trình chăm sóc
            dành cho hội viên khi Mộc công bố.
          </p>
          <div className="mm-members-hero-actions">
            {status === "loading" ? (
              <p role="status">Đang kiểm tra tài khoản...</p>
            ) : user ? (
              <Link className="mm-primary-cta" href="/tai-khoan">
                Quản lý tài khoản <ArrowRight size={17} />
              </Link>
            ) : (
              <>
                <Link className="mm-primary-cta" href="/dang-ky">
                  Đăng ký thành viên <ArrowRight size={17} />
                </Link>
                <Link className="mm-outline-cta" href="/dang-nhap">
                  Đã có tài khoản?
                </Link>
              </>
            )}
          </div>
        </div>
        <section className="mm-members-cards" aria-label="Cấp độ hội viên">
          <article className="mm-members-card">
            <div className="mm-members-symbol">
              <UserRound size={26} />
            </div>
            <span className="mm-overline">CẤP ĐỘ CƠ BẢN</span>
            <h2>Khách hàng</h2>
            <p>
              Tài khoản miễn phí để truy cập khu vực cá nhân và theo dõi những yêu cầu đặt lịch của
              bạn.
            </p>
            <div className="mm-members-divider" />
            <p>
              <CheckCircle2 size={16} /> Theo dõi lịch hẹn và báo giá
            </p>
            <p>
              <CheckCircle2 size={16} /> Lưu hồ sơ khách hàng cá nhân
            </p>
            <p>
              <CheckCircle2 size={16} /> Nhận thông báo về chương trình khi triển khai
            </p>
            <Link href="/dang-ky" className="mm-members-link">
              Tạo tài khoản <ArrowRight size={17} />
            </Link>
          </article>
          <article className="mm-members-card vip">
            <div className="mm-members-symbol">
              <Crown size={26} />
            </div>
            <span className="mm-overline">DỰ KIẾN · CHƯA KÍCH HOẠT</span>
            <h2>Hội viên VIP</h2>
            <p>
              Không gian dành cho khách hàng gắn bó cùng Mộc, đang được xây dựng chính sách quyền
              lợi chính thức.
            </p>
            <div className="mm-members-divider" />
            <p>
              <Sparkles size={16} /> Tiêu chí xét hạng: chưa công bố
            </p>
            <p>
              <HeartHandshake size={16} /> Quyền lợi/ưu đãi: chưa công bố
            </p>
            <p>
              <BadgeCheck size={16} /> Xét hạng theo dữ liệu hệ thống khi triển khai
            </p>
            <div className="mm-members-note">
              Chưa có tài khoản nào được tự động gán VIP. Mộc sẽ công bố điều kiện minh bạch trước
              khi áp dụng.
            </div>
          </article>
        </section>
        <p className="mm-members-legal">
          <ShieldCheck size={17} /> Chúng tôi không hiển thị điểm, ưu đãi hay hạng VIP chưa được xác
          minh từ hệ thống.
        </p>
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
