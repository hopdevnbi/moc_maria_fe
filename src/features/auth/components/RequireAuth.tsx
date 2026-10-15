"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { LoadingState } from "@/shared/loading/loading-state";

export function RequireAuth({
  children,
  requiredPermissions = [],
}: {
  children: ReactNode;
  requiredPermissions?: string[];
}) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const hasPermissions =
    user !== null &&
    requiredPermissions.every((permission) => user.permissions.includes(permission));

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/dang-nhap?returnTo=" + encodeURIComponent(pathname));
      return;
    }
    if (status === "authenticated" && !hasPermissions) {
      router.replace("/cam-truy-cap");
    }
  }, [status, hasPermissions, pathname, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <LoadingState
          title="Đang mở không gian của bạn"
          description="Mộc đang kiểm tra phiên đăng nhập của bạn."
          shape="form"
        />
      </div>
    );
  }

  if (status !== "authenticated" || !hasPermissions) return null;
  return children;
}
