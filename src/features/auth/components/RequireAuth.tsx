"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
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
  const { status, user, retrySession } = useAuth();
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
        <p className="mt-5 text-center text-sm">
          <a
            href={"/pwa/recover.html?returnTo=" + encodeURIComponent(pathname)}
            className="inline-block min-h-12 px-4 py-3 underline"
          >
            Trang tải quá lâu? Mở công cụ khôi phục
          </a>
        </p>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center" role="alert">
        <h1 className="text-2xl font-semibold">Chưa thể kiểm tra phiên đăng nhập</h1>
        <p className="mt-4 text-[var(--moc-muted)]">
          Kết nối đến Mộc đang gián đoạn nên chưa thể xác định phiên đăng nhập. Hãy thử lại, hoặc
          đăng nhập nếu bạn đang mở Mộc trên thiết bị mới.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void retrySession()}
            className="min-h-12 rounded-xl bg-[var(--moc-green)] px-5 font-semibold text-white"
          >
            Thử kết nối lại
          </button>
          <Link
            href={"/dang-nhap?returnTo=" + encodeURIComponent(pathname)}
            className="flex min-h-12 items-center rounded-xl border px-5 font-semibold"
          >
            Đăng nhập
          </Link>
          <a
            href={"/pwa/recover.html?returnTo=" + encodeURIComponent(pathname)}
            className="flex min-h-12 items-center rounded-xl border px-5 font-semibold"
          >
            Khôi phục ứng dụng
          </a>
        </div>
      </main>
    );
  }

  if (status !== "authenticated" || !hasPermissions) return null;
  return children;
}
