"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ChevronRight,
  Crown,
  Gift,
  Headset,
  LayoutDashboard,
  Languages,
  LockKeyhole,
  Menu,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  UserRoundCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { AdminUserLink } from "./admin-user-link";
import { LanguageSelector } from "@/shared/i18n/language-selector";
import { useLocale } from "@/shared/i18n/locale-provider";
import type { MessageKey } from "@/shared/i18n/messages";
import "@/app/home.css";
import "./marketplace.css";
import "./admin-workspace.css";

type AdminNavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  permission?: string;
  adminOnly?: boolean;
  superOnly?: boolean;
  description?: string;
};
type AdminNavGroup = { label: string; items: AdminNavItem[] };
const adminLabels: Record<string, MessageKey> = {
  "TRUNG TÂM ĐIỀU HÀNH": "admin.control",
  "Tổng quan": "admin.overview",
  "HOẠT ĐỘNG KINH DOANH": "admin.business",
  "Lịch đặt & yêu cầu": "admin.appointments",
  "Kỹ thuật viên": "admin.therapists",
  "Đánh giá KTV": "admin.reviews",
  "Dịch vụ & bảng giá": "admin.catalog",
  "Quản lý bản dịch": "editor.title",
  "Sự kiện & mở hộp quà": "admin.events",
  "Cơ sở & vận hành": "admin.branches",
  "Chấm công & Coin": "admin.attendance",
  "KHÁCH HÀNG & HỘI VIÊN": "admin.customersGroup",
  "Khách hàng": "admin.customers",
  "Hội viên VIP": "admin.vip",
  "HỆ THỐNG": "admin.system",
  "Email thông báo": "admin.email",
  "Hồ sơ cá nhân": "admin.profile",
  "Phân quyền & cấu hình": "admin.permissions",
  "Quản trị": "admin.management",
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "TRUNG TÂM ĐIỀU HÀNH",
    items: [{ label: "Tổng quan", icon: LayoutDashboard, href: "/quan-tri" }],
  },
  {
    label: "HOẠT ĐỘNG KINH DOANH",
    items: [
      {
        label: "Lịch đặt & yêu cầu",
        icon: CalendarClock,
        href: "/quan-tri/lich-hen",
        permission: "customers.manage",
        adminOnly: true,
      },
      {
        label: "Kỹ thuật viên",
        icon: UserRoundCheck,
        href: "/quan-tri/ktv",
        permission: "staff.manage",
      },
      {
        label: "Đánh giá KTV",
        icon: Star,
        href: "/quan-tri/danh-gia-ktv",
        permission: "staff.manage",
      },
      {
        label: "Dịch vụ & bảng giá",
        icon: Sparkles,
        href: "/quan-tri/dich-vu",
        permission: "staff.manage",
      },
      {
        label: "Quản lý bản dịch",
        icon: Languages,
        href: "/quan-tri/da-ngon-ngu",
        permission: "staff.manage",
        superOnly: true,
      },
      {
        label: "Sự kiện & mở hộp quà",
        icon: Gift,
        href: "/quan-tri/su-kien",
        permission: "admin.portal",
        superOnly: true,
      },
      {
        label: "Cơ sở & vận hành",
        icon: Building2,
        href: "/quan-tri/co-so",
        permission: "staff.manage",
      },
      {
        label: "Chấm công & Coin",
        icon: ClipboardCheck,
        href: "/quan-tri/cham-cong",
        permission: "admin.portal",
        superOnly: true,
      },
    ],
  },
  {
    label: "KHÁCH HÀNG & HỘI VIÊN",
    items: [
      {
        label: "Khách hàng",
        icon: UsersRound,
        href: "/quan-tri/khach-hang",
        permission: "customers.manage",
        adminOnly: true,
      },
      {
        label: "Hội viên VIP",
        icon: Crown,
        href: "/quan-tri/hoi-vien-vip",
        permission: "customers.manage",
        adminOnly: true,
      },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      {
        label: "Email thông báo",
        icon: Settings2,
        href: "/quan-tri/thong-bao",
        permission: "roles.manage",
      },
      { label: "Hồ sơ cá nhân", icon: UserRoundCheck, href: "/quan-tri/ho-so" },
      {
        label: "Phân quyền & cấu hình",
        icon: Settings2,
        href: "/quan-tri/phan-quyen",
        permission: "roles.manage",
        adminOnly: true,
        superOnly: true,
      },
    ],
  },
];

type AdminUser = {
  id: string;
  displayName: string;
  email: string | null;
  roles: string[];
  permissions: string[];
};

export function adminVisibleGroups(user: AdminUser | null): AdminNavGroup[] {
  if (!user) return [];
  const canControl = user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN");
  return adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.permission || user.permissions.includes(item.permission)) &&
          (!item.adminOnly || canControl) &&
          (!item.superOnly || user.roles.includes("SUPER_ADMIN")),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/quan-tri" && pathname.startsWith(href + "/"));
}

function SidebarMenu({
  groups,
  pathname,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  const labelFor = (label: string) => (adminLabels[label] ? t(adminLabels[label]) : label);
  return (
    <nav className="mm-admin-nav" aria-label="Danh mục quản trị">
      {groups.map((group) => (
        <div className="mm-admin-nav-group" key={group.label}>
          <p className="mm-admin-nav-group-label">{labelFor(group.label)}</p>
          <div className="mm-admin-nav-items">
            {group.items.map(({ label, icon: Icon, href, description }) =>
              href ? (
                <Link
                  key={label}
                  href={href}
                  onClick={onNavigate}
                  className={
                    "mm-admin-nav-link" + (isActivePath(pathname, href) ? " is-active" : "")
                  }
                  aria-current={isActivePath(pathname, href) ? "page" : undefined}
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span>{labelFor(label)}</span>
                  {isActivePath(pathname, href) ? (
                    <span className="mm-admin-active-dot" />
                  ) : (
                    <ChevronRight size={15} className="mm-admin-arrow" aria-hidden="true" />
                  )}
                </Link>
              ) : (
                <div
                  className="mm-admin-nav-pending"
                  key={label}
                  aria-label={label + ": " + description}
                >
                  <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                  <span>
                    {label}
                    <small>{description}</small>
                  </span>
                  <LockKeyhole size={14} aria-hidden="true" />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminSidebarContent({
  groups,
  pathname,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  return (
    <>
      <div className="mm-admin-brand">
        <Link href="/quan-tri" className="mm-admin-brand-link" onClick={onNavigate}>
          <Image src="/brand/moc-maria-mark.webp" alt="" width={51} height={41} priority />
          <span className="mm-admin-brand-text">
            <strong>Mộc Maria</strong>
            <small>MANAGEMENT STUDIO</small>
          </span>
        </Link>
        <span className="mm-admin-brand-pill">ADMIN</span>
      </div>
      <SidebarMenu groups={groups} pathname={pathname} onNavigate={onNavigate} />
      <div className="mm-admin-sidebar-foot">
        <div className="mm-admin-help-mark">
          <Headset size={19} aria-hidden="true" />
        </div>
        <div>
          <strong>{t("admin.workspace")}</strong>
          <span>{t("admin.workspaceHint")}</span>
        </div>
        <Link href="/" aria-label={t("admin.customerSite")} title={t("admin.customerSite")}>
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </>
  );
}

export function AdminShell({
  title,
  children,
  permission = "admin.portal",
  showHeading = true,
}: {
  title: string;
  children: ReactNode;
  permission?: string;
  showHeading?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = adminVisibleGroups(user);
  const pageLabel =
    groups.flatMap((g) => g.items).find((i) => i.href && isActivePath(pathname, i.href))?.label ??
    "Quản trị";

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <RequireAuth requiredPermissions={["admin.portal", permission]}>
      <div className="mm-admin-app">
        <a href="#mm-admin-main" className="mm-admin-skip">
          {t("admin.skip")}
        </a>
        <aside className="mm-admin-sidebar" aria-label="Sidebar quản trị">
          <AdminSidebarContent groups={groups} pathname={pathname} />
        </aside>
        <div className="mm-admin-workspace">
          <header className="mm-admin-topbar">
            <div className="mm-admin-topbar-left">
              <button
                type="button"
                className="mm-admin-menu-button"
                onClick={() => setMobileOpen(true)}
                aria-label={t("admin.menu")}
                aria-expanded={mobileOpen}
                aria-controls="mm-admin-mobile-drawer"
              >
                <Menu size={23} aria-hidden="true" />
              </button>
              <div className="mm-admin-crumbs">
                <Link href="/quan-tri">{t("admin.management")}</Link>
                <ChevronRight size={15} aria-hidden="true" />
                <span aria-current="page">
                  {adminLabels[pageLabel] ? t(adminLabels[pageLabel]) : pageLabel}
                </span>
              </div>
            </div>
            <div className="mm-admin-topbar-right">
              <span className="mm-admin-session">
                <ShieldCheck size={15} /> {t("admin.session")}
              </span>
              <Link className="mm-admin-backsite" href="/" title={t("admin.customerSite")}>
                <ArrowLeft size={16} aria-hidden="true" />
                <span>{t("admin.customerSite")}</span>
              </Link>
              <LanguageSelector />
              <AdminUserLink />
            </div>
          </header>
          <main id="mm-admin-main" className="mm-admin-main">
            {showHeading && (
              <div className="mm-admin-page-heading">
                <div>
                  <span className="mm-admin-eyebrow">
                    <span /> MỘC MARIA · MANAGEMENT
                  </span>
                  <h1>{title}</h1>
                </div>
                <p>Tổ chức công việc nhẹ nhàng, chăm sóc mỗi trải nghiệm chu đáo hơn.</p>
              </div>
            )}
            {children}
          </main>
          <footer className="mm-admin-footer">
            <span>© 2026 Mộc Maria · Khu vực quản trị nội bộ</span>
            <span>{t("admin.footer")}</span>
          </footer>
        </div>
        {mobileOpen && (
          <div className="mm-admin-drawer-layer">
            <button
              type="button"
              className="mm-admin-drawer-scrim"
              aria-label={t("admin.closeMenu")}
              onClick={() => setMobileOpen(false)}
            />
            <aside
              id="mm-admin-mobile-drawer"
              className="mm-admin-mobile-drawer"
              aria-label="Menu quản trị mobile"
            >
              <button
                type="button"
                className="mm-admin-close-menu"
                onClick={() => setMobileOpen(false)}
                aria-label={t("admin.closeMenu")}
              >
                <X size={21} />
              </button>
              <AdminSidebarContent
                groups={groups}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
