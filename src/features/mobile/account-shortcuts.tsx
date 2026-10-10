"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  KeyRound,
  LogOut,
  MessageCircle,
  UserRound,
  Users,
} from "lucide-react";

type AccountShortcutsProps = {
  technician: boolean;
  signingOut: boolean;
  onSignOut: () => void | Promise<void>;
};

export function AccountShortcuts({ technician, signingOut, onSignOut }: AccountShortcutsProps) {
  return (
    <div className="mm-account-shortcut-stack">
      <section className="mm-account-journey" aria-label="Hành động nhanh">
        <div className="mm-account-shortcut-heading">
          <span className="mm-overline">LỐI TẮT NHANH</span>
          <h2>{technician ? "Bắt đầu công việc" : "Bắt đầu trải nghiệm"}</h2>
        </div>
        <div className="mm-account-journey-links">
          <Link
            className="mm-account-journey-primary"
            href={technician ? "/tin-nhan" : "/dat-lich"}
          >
            {technician ? <MessageCircle size={20} /> : <CalendarDays size={20} />}
            <span>{technician ? "Trả lời khách hàng" : "Đặt lịch chăm sóc"}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link
            className="mm-account-journey-secondary"
            href={technician ? "#lich-lam-viec" : "/chuyen-vien"}
          >
            {technician ? <CalendarDays size={20} /> : <Users size={20} />}
            <span>{technician ? "Lịch làm việc" : "Chọn KTV & Chat"}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section
        className="mm-account-security-shortcuts"
        aria-labelledby="mm-account-security-heading"
      >
        <div className="mm-account-shortcut-heading">
          <span className="mm-overline">THIẾT LẬP CÁ NHÂN</span>
          <h2 id="mm-account-security-heading">Tài khoản & bảo mật</h2>
        </div>
        <div className="mm-account-security-links">
          <Link href="#thong-tin-tai-khoan">
            <UserRound size={20} aria-hidden="true" />
            <span>Thông tin của tôi</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="#doi-mat-khau">
            <KeyRound size={20} aria-hidden="true" />
            <span>Đổi mật khẩu</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="mm-account-security-footer">
          <button type="button" disabled={signingOut} onClick={onSignOut}>
            <LogOut size={18} aria-hidden="true" />
            {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </section>
    </div>
  );
}
