"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function AccountNav() {
  const { status, user, logout } = useAuth();

  if (status === "loading") {
    return <div className="h-10 w-32 animate-pulse rounded-full bg-white/60" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dang-nhap"
          className="rounded-full border border-[var(--moc-border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--moc-green)]"
        >
          Đăng nhập
        </Link>
        <Link
          href="/dang-ky"
          className="rounded-full bg-[var(--moc-green)] px-4 py-2 text-sm font-semibold text-white"
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/tai-khoan"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--moc-border)] bg-white/85 px-4 py-2 text-sm font-semibold text-[var(--moc-green-deep)]"
      >
        <UserRound size={16} />
        {user.displayName}
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Đăng xuất"
        className="rounded-full border border-[var(--moc-border)] bg-white/85 p-2.5 text-[var(--moc-muted)]"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
