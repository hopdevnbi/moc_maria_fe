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
import { ProviderDescriptionEditor } from "@/features/mobile/profile-editor";
import { CustomerAccountProfile } from "@/features/mobile/customer-account-profile";
import { CustomerAttendanceCard } from "@/features/staff-attendance/customer-attendance-card";
import { AppointmentInquiries } from "@/features/mobile/inquiries";
import { AccountSearch } from "@/features/mobile/account-search";
import { AccountShortcuts } from "@/features/mobile/account-shortcuts";
import { TechnicianWorkspace } from "@/features/mobile/ktv-workspace";
import { StaffAttendanceCard } from "@/features/staff-attendance/staff-attendance-card";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLocale } from "@/shared/i18n/locale-provider";
import { ReferralShortcut } from "@/features/referrals/referrals";
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
  const { t, locale } = useLocale();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const customer =
    user.permissions.includes("customer.portal") ||
    !user.roles.some((role) =>
      [
        "SUPER_ADMIN",
        "ADMIN",
        "BRANCH_MANAGER",
        "RECEPTIONIST",
        "THERAPIST",
        "DOCTOR_CONSULTANT",
      ].includes(role),
    );
  const technician = user.roles.includes("THERAPIST") || user.roles.includes("DOCTOR_CONSULTANT");
  const admin = user.permissions.includes("admin.portal");
  if (technician) return <TechnicianWorkspace />;
  async function signOut() {
    setBusy(true);
    setNotice("");
    try {
      await logout();
    } catch {
      setNotice(t("account.logoutError"));
    } finally {
      setBusy(false);
    }
  }
  const actions = technician
    ? [
        {
          href: "/ktv/an-toan",
          title: "An toàn khi đi phục vụ",
          text: "Tự bật GPS, check-in và SOS khi cần hỗ trợ",
          Icon: ShieldCheck,
        },
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
          title: t("account.choose"),
          text: t("account.chooseHint"),
          Icon: Users,
        },
        {
          href: "/tin-nhan",
          title: t("account.messages"),
          text: t("account.messagesHint"),
          Icon: MessageCircle,
        },
        {
          href: "/dich-vu",
          title: t("account.explore"),
          text: t("account.exploreHint"),
          Icon: Flower2,
        },
        ...(customer
          ? [
              {
                href: "/lich-hen",
                title: t("account.appointments"),
                text: t("account.appointmentsHint"),
                Icon: CalendarDays,
              },
            ]
          : []),
      ];
  return (
    <main className="mm-container mm-account-main" lang={locale}>
      <section className="mm-account-welcome">
        <div className="mm-account-welcome-details">
          <span className="mm-overline">
            {technician ? t("account.technician") : t("account.kicker")}
          </span>
          <h1>{t("account.welcome", { name: user.displayName })}</h1>
          <p>
            {technician
              ? "Trả lời khách hàng, xem lịch làm việc và theo dõi hồ sơ tại đây."
              : t("account.intro")}
          </p>
        </div>
        <button
          className="mm-account-hero-logout"
          type="button"
          disabled={busy}
          onClick={() => void signOut()}
        >
          <LogOut size={17} aria-hidden="true" />{" "}
          {busy ? t("account.signingOut") : t("account.logout")}
        </button>
      </section>
      {customer &&
      !user.roles.some((role) =>
        [
          "SUPER_ADMIN",
          "ADMIN",
          "BRANCH_MANAGER",
          "RECEPTIONIST",
          "THERAPIST",
          "DOCTOR_CONSULTANT",
        ].includes(role),
      ) ? (
        <CustomerAttendanceCard />
      ) : (
        <StaffAttendanceCard />
      )}
      {customer && <CustomerAccountProfile />}
      <ReferralShortcut />
      <AccountShortcuts technician={technician} signingOut={busy} onSignOut={signOut} />
      {notice && (
        <p role="alert" className="mm-account-shortcut-notice">
          {notice}
        </p>
      )}
      {!technician && <AccountSearch />}
      <nav className="mm-account-actions" aria-label={t("account.shortcuts")}>
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
          <ShieldCheck size={18} /> {t("account.admin")}
        </Link>
      )}
      {user.roles.includes("SUPER_ADMIN") && (
        <Link className="mm-primary-cta" href="/quan-tri/an-toan-ktv">
          <ShieldCheck size={18} /> {t("account.safety")}
        </Link>
      )}
      {user.roles.includes("SUPER_ADMIN") && (
        <Link className="mm-outline-cta" href="/quan-tri/mo-ta-ktv">
          {t("account.reviewProfile")}
        </Link>
      )}
      {customer && (
        <Link className="mm-text-link" href="/hoi-vien">
          {t("account.membership")} <ArrowRight size={15} />
        </Link>
      )}
      {technician && (
        <div id="lich-lam-viec" className="mm-account-planning">
          <OwnProviderPlanning />
        </div>
      )}
      <AppointmentInquiries />
      {technician && <ProviderDescriptionEditor />}
      <section className={customer ? "mm-account-settings is-customer" : "mm-account-settings"}>
        {!customer && (
          <article className="mm-account-profile" id="thong-tin-tai-khoan">
            <h2>{t("account.info")}</h2>
            <p className="mm-account-role">
              {technician
                ? t("nav.therapists")
                : customer
                  ? t("account.customer")
                  : t("account.member")}
            </p>
            <dl>
              <div>
                <dt>{t("account.fullName")}</dt>
                <dd>{user.displayName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email || t("account.missing")}</dd>
              </div>
              <div>
                <dt>{t("account.phone")}</dt>
                <dd>{user.phone || t("account.missing")}</dd>
              </div>
            </dl>
            {user.mustChangePassword && (
              <p className="mm-account-notice">{t("account.passwordNotice")}</p>
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
                  setNotice(t("account.logoutError"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? t("account.signingOut") : t("account.logoutAll")}
            </button>
            {notice && <p role="alert">{notice}</p>}
          </article>
        )}
        <div id="doi-mat-khau">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
