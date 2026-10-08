"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

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
        <div className="h-40 animate-pulse rounded-[2rem] bg-white/70" />
      </div>
    );
  }

  if (status !== "authenticated" || !hasPermissions) return null;
  return children;
}
