"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePrivateData } from "./private-api";
import type { AdminStaffProfile } from "./admin-profile-types";

export function AdminUserLink() {
  const { user } = useAuth();
  const { data } = usePrivateData<AdminStaffProfile>("/staff/me");
  const avatar = data?.staff.avatarUrl;
  const initial = (user?.displayName || "A").trim().slice(0, 1).toUpperCase();
  const role = user?.roles.includes("SUPER_ADMIN")
    ? "Super Admin"
    : user?.roles.includes("ADMIN")
      ? "Quản trị viên"
      : "Nhân viên quản lý";
  return (
    <Link
      href="/quan-tri/ho-so"
      className="mm-admin-user mm-admin-user-link"
      aria-label="Xem và chỉnh sửa hồ sơ quản trị của tôi"
      title="Hồ sơ cá nhân"
    >
      <span className="mm-admin-avatar" aria-hidden="true">
        {avatar?.startsWith("https://") ? (
          <Image src={avatar} alt="" width={40} height={40} unoptimized />
        ) : (
          initial
        )}
      </span>
      <span className="mm-admin-user-detail">
        <strong>{user?.displayName || "Quản trị viên"}</strong>
        <small>{role}</small>
      </span>
    </Link>
  );
}
