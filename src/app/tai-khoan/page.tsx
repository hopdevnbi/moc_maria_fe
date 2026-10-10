"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  MessageCircle,
  Users,
  Flower2,
  UserRound,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { CustomerProfileEditor, ProviderDescriptionEditor } from "@/features/mobile/profile-editor";
import { AppointmentInquiries } from "@/features/mobile/inquiries";
import { AccountSearch } from "@/features/mobile/account-search";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { OwnProviderPlanning } from "@/features/marketplace/provider-planning";
import "@/features/marketplace/marketplace.css";
import "@/features/mobile/account.css";

export default function AccountPage() {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <RequireAuth>
        <AccountContent />
      </RequireAuth>
      <MobileNavigation active="account" />
    </div>
  );
}
function AccountContent() {
  const { user, logout, logoutAll } = useAuth();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const customer = user.permissions.includes("customer.portal");
  const technician = user.roles.includes("THERAPIST") || user.roles.includes("DOCTOR_CONSULTANT");
  const admin = user.permissions.includes("admin.portal");
  const actions = technician
    ? [
        {
          href: "/tin-nhan",
          title: "Tin nhắn khách hàng",
          text: "Trả lời, tư vấn và quản lý chặn",
          Icon: MessageCircle,
        },
        {
          href: "#lich-lam-viec",
          title: "Lịch làm việc",
          text: "Xem các ca đã được phân công",
          Icon: CalendarDays,
        },
        {
          href: "#mo-ta-ktv",
          title: "Mô tả & hồ sơ KTV",
          text: "Cập nhật giới thiệu và gửi super admin duyệt",
          Icon: UserRound,
        },
        {
          href: "/ktv/dao-tao",
          title: "Đào tạo & chứng nhận",
          text: "Theo dõi quá trình đào tạo",
          Icon: Flower2,
        },
      ]
    : [
        {
          href: "/chuyen-vien",
          title: "Chọn kỹ thuật viên",
          text: "Chọn người và dịch vụ phù hợp",
          Icon: Users,
        },
        {
          href: "/tin-nhan",
          title: "Tin nhắn của tôi",
          text: "Tiếp tục chat riêng cùng KTV",
          Icon: MessageCircle,
        },
        {
          href: "/dich-vu",
          title: "Khám phá dịch vụ",
          text: "Xem thời lượng và bảng giá",
          Icon: Flower2,
        },
        ...(customer
          ? [
              {
                href: "/lich-hen",
                title: "Lịch hẹn của tôi",
                text: "Theo dõi các lịch hẹn đã đặt",
                Icon: CalendarDays,
              },
            ]
          : []),
      ];
  return (
    <main className="mm-container mm-account-main">
      <section className="mm-account-welcome">
        <div>
          <span className="mm-overline">
            {technician ? "KHÔNG GIAN KỸ THUẬT VIÊN" : "TÀI KHOẢN CỦA BẠN"}
          </span>
          <h1>Xin chào, {user.displayName}</h1>
          <p>
            {technician
              ? "Trả lời khách hàng, xem lịch làm việc và theo dõi hồ sơ tại đây."
              : "Chọn KTV, tìm hiểu dịch vụ và bắt đầu một cuộc trò chuyện riêng."}
          </p>
        </div>
        <Link className="mm-primary-cta" href={technician ? "/tin-nhan" : "/chuyen-vien"}>
          {technician ? <MessageCircle size={18} /> : <Users size={18} />}{" "}
          {technician ? "Trả lời khách hàng" : "Chọn KTV & Chat"}
          <ArrowRight size={16} />
        </Link>
      </section>
      <div className="mm-account-toolbar">
        <Link href="#thong-tin-tai-khoan">Thông tin của tôi</Link>
        <Link href="#doi-mat-khau">Đổi mật khẩu</Link>
        <button
          type="button"
          className="mm-account-signout"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNotice("");
            try {
              await logout();
            } catch {
              setNotice("Chưa đăng xuất được. Vui lòng thử lại.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={17} />
          {busy ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </div>
      {notice && <p role="alert">{notice}</p>}
      {!technician && (
        <Link className="mm-primary-cta mm-account-booking" href="/dat-lich">
          <CalendarDays size={20} /> Đặt lịch chăm sóc <ArrowRight size={17} />
        </Link>
      )}
      {!technician && <AccountSearch />}
      <nav className="mm-account-actions" aria-label="Tiện ích tài khoản">
        {actions.map(({ href, title, text, Icon }) => (
          <Link href={href} key={title}>
            <Icon size={22} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
            <ArrowRight size={16} />
          </Link>
        ))}
      </nav>
      {admin && (
        <Link className="mm-primary-cta" href="/quan-tri">
          <ShieldCheck size={18} /> Mở khu vực quản trị
        </Link>
      )}
      {user.roles.includes("SUPER_ADMIN") && (
        <Link className="mm-outline-cta" href="/quan-tri/mo-ta-ktv">
          Duyệt mô tả KTV
        </Link>
      )}
      {customer && (
        <Link className="mm-text-link" href="/hoi-vien">
          Hội viên & quyền lợi của bạn <ArrowRight size={15} />
        </Link>
      )}
      {technician && (
        <div id="lich-lam-viec" className="mm-account-planning">
          <OwnProviderPlanning />
        </div>
      )}
      <AppointmentInquiries />
      {technician && <ProviderDescriptionEditor />}
      <section className="mm-account-settings">
        <article className="mm-account-profile" id="thong-tin-tai-khoan">
          <h2>Thông tin tài khoản</h2>
          <p className="mm-account-role">
            {technician ? "Kỹ thuật viên" : customer ? "Khách hàng" : "Thành viên Mộc Maria"}
          </p>
          <dl>
            <div>
              <dt>Họ và tên</dt>
              <dd>{user.displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{user.phone || "Chưa cập nhật"}</dd>
            </div>
          </dl>
          {customer && <CustomerProfileEditor />}
          {user.mustChangePassword && (
            <p className="mm-account-notice">
              Bạn đang dùng mật khẩu ban đầu. Hãy đổi mật khẩu của riêng mình.
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            className="mm-account-logout"
            onClick={async () => {
              setBusy(true);
              try {
                await logoutAll();
              } catch {
                setNotice("Chưa đăng xuất được. Vui lòng thử lại.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Đang đăng xuất..." : "Đăng xuất mọi thiết bị"}
          </button>
          {notice && <p role="alert">{notice}</p>}
        </article>
        <div id="doi-mat-khau">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
