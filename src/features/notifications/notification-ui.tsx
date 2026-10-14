"use client";
import Link from "next/link";
import { CalendarClock, MessageCircle } from "lucide-react";
import "./notifications.css";

export function NotificationNav({ active }: { active: "schedule" | "zalo" }) {
  return (
    <nav className="nt-nav" aria-label="Quản trị thông báo">
      <Link href="/quan-tri/thong-bao" aria-current={active === "schedule" ? "page" : undefined}>
        <CalendarClock size={17} aria-hidden />
        Lịch & email
      </Link>
      <Link href="/quan-tri/zalo" aria-current={active === "zalo" ? "page" : undefined}>
        <MessageCircle size={17} aria-hidden />
        Bot Zalo
      </Link>
    </nav>
  );
}

export function NotificationSwitch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="nt-switch">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span aria-hidden="true" />
    </label>
  );
}

export function NotificationBadge({
  children,
  tone = "good",
}: {
  children: React.ReactNode;
  tone?: "good" | "muted" | "warn";
}) {
  return (
    <span className={`nt-badge nt-badge--${tone}`}>
      <span aria-hidden />
      {children}
    </span>
  );
}

export const notificationDate = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
