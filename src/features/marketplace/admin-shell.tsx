"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MarketShell } from "./components";
export function AdminShell({
  title,
  children,
  permission = "admin.portal",
}: {
  title: string;
  children: ReactNode;
  permission?: string;
}) {
  return (
    <RequireAuth requiredPermissions={["admin.portal", permission]}>
      <MarketShell title={title} eyebrow="QUẢN TRỊ MỘC MARIA">
        <AdminNavigation />
        {children}
      </MarketShell>
    </RequireAuth>
  );
}
function AdminNavigation() {
  const { user } = useAuth();
  return (
    <nav className="market-portal-nav" aria-label="Quản trị">
      <Link href="/quan-tri">Tổng quan</Link>
      {user?.permissions.includes("roles.manage") && <Link href="/quan-tri/thong-bao">Email thông báo</Link>}
      {user?.permissions.includes("staff.manage") && (
        <>
          <Link href="/quan-tri/dich-vu">Dịch vụ & bảng giá</Link>
          <Link href="/quan-tri/co-so">Cơ sở & tài nguyên</Link>
          <Link href="/quan-tri/ktv">Ứng tuyển & đào tạo</Link>
        </>
      )}
    </nav>
  );
}
