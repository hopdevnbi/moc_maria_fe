"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Crown,
  Headset,
  LayoutDashboard,
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
import "@/app/home.css";
import "./marketplace.css";
import "./admin-workspace.css";

type AdminNavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  permission?: string;
  adminOnly?: boolean;
  description?: string;
};
type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "TRUNG TÂM ĐIỀU HÀNH",
    items: [{ label: "Tổng quan", icon: LayoutDashboard, href: "/quan-tri" }],
  },
  {
    label: "HOẠT ĐỘNG KINH DOANH",
    items: [
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
        label: "Cơ sở & vận hành",
        icon: Building2,
        href: "/quan-tri/co-so",
        permission: "staff.manage",
      },
    ],
  },
  {
    label: "KHÁCH HÀNG & HỘI VIÊN",
    items: [
      {
        label: "Khách hàng",
        icon: UsersRound,
        permission: "customers.manage",
        adminOnly: true,
        description: "Đang hoàn thiện",
      },
      {
        label: "Hội viên VIP",
        icon: Crown,
        permission: "customers.manage",
        adminOnly: true,
        description: "Chờ phát hành",
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
        adminOnly: true,
        description: "Giai đoạn tiếp theo",
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
          (!item.adminOnly || canControl),
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
  return (
    <nav className="mm-admin-nav" aria-label="Danh mục quản trị">
      {groups.map((group) => (
        <div className="mm-admin-nav-group" key={group.label}>
          <p className="mm-admin-nav-group-label">{group.label}</p>
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
                  <span>{label}</span>
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
          <strong>Không gian điều hành</strong>
          <span>Quản lý hiệu quả · Phục vụ tận tâm</span>
        </div>
        <Link href="/" aria-label="Về trang khách hàng" title="Về trang khách hàng">
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
}: {
  title: string;
  children: ReactNode;
  permission?: string;
}) {
  const { user } = useAuth();
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
          Đi đến nội dung
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
                aria-label="Mở menu quản trị"
                aria-expanded={mobileOpen}
                aria-controls="mm-admin-mobile-drawer"
              >
                <Menu size={23} aria-hidden="true" />
              </button>
              <div className="mm-admin-crumbs">
                <Link href="/quan-tri">Quản trị</Link>
                <ChevronRight size={15} aria-hidden="true" />
                <span aria-current="page">{pageLabel}</span>
              </div>
            </div>
            <div className="mm-admin-topbar-right">
              <span className="mm-admin-session">
                <ShieldCheck size={15} /> Phiên quản trị
              </span>
              <Link className="mm-admin-backsite" href="/" title="Trở về trang dành cho khách">
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Trang khách hàng</span>
              </Link>
              <AdminUserLink />
            </div>
          </header>
          <main id="mm-admin-main" className="mm-admin-main">
            <div className="mm-admin-page-heading">
              <div>
                <span className="mm-admin-eyebrow">
                  <span /> MỘC MARIA · MANAGEMENT
                </span>
                <h1>{title}</h1>
              </div>
              <p>Tổ chức công việc nhẹ nhàng, chăm sóc mỗi trải nghiệm chu đáo hơn.</p>
            </div>
            {children}
          </main>
          <footer className="mm-admin-footer">
            <span>© 2026 Mộc Maria · Khu vực quản trị nội bộ</span>
            <span>Chỉ hiển thị chức năng theo quyền tài khoản</span>
          </footer>
        </div>
        {mobileOpen && (
          <div className="mm-admin-drawer-layer">
            <button
              type="button"
              className="mm-admin-drawer-scrim"
              aria-label="Đóng menu"
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
                aria-label="Đóng menu"
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
