"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { APP_RELEASE } from "./version";
import "./site-release-update.css";

const CHECK_INTERVAL = 60_000;
const IDLE_TIME = 15_000;
const reloadPage = () => window.location.reload();

function publicBrowseRoute(pathname: string | null) {
  return (
    pathname === "/" ||
    pathname === "/bang-gia" ||
    pathname === "/hoi-vien" ||
    pathname === "/chuyen-vien" ||
    pathname?.startsWith("/chuyen-vien/") ||
    pathname === "/dich-vu" ||
    pathname?.startsWith("/dich-vu/")
  );
}

function hasInputInProgress() {
  if (document.querySelector("input[type='checkbox']:checked, input[type='radio']:checked"))
    return true;
  if (document.activeElement?.matches("input, textarea, select, [contenteditable='true']"))
    return true;
  return (
    [
      ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea, select",
      ),
    ].some((field) => field.value.trim() !== "") ||
    [...document.querySelectorAll("[contenteditable='true']")].some((field) =>
      field.textContent?.trim(),
    )
  );
}

export function SiteReleaseUpdate({
  currentVersion = APP_RELEASE,
  reload = reloadPage,
}: {
  currentVersion?: string;
  reload?: () => void;
}) {
  const pathname = usePathname();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (currentVersion === "development") return;
    let latest: string | null = null;
    let lastActivity = Date.now();
    let lastCheck = -Infinity;
    let disposed = false;
    let applying = false;
    let request: AbortController | null = null;
    const rememberActivity = () => {
      lastActivity = Date.now();
    };
    const applyIfSafe = () => {
      if (
        !latest ||
        applying ||
        document.visibilityState === "hidden" ||
        !publicBrowseRoute(pathname) ||
        Date.now() - lastActivity < IDLE_TIME ||
        hasInputInProgress()
      )
        return;
      const guard = "mocmaria.release.reload." + currentVersion;
      try {
        if (sessionStorage.getItem(guard) === latest) return;
        sessionStorage.setItem(guard, latest);
      } catch {
        /* Updating also works when browser storage is unavailable. */
      }
      applying = true;
      reload();
    };
    const check = async () => {
      if (document.visibilityState === "hidden" || request || Date.now() - lastCheck < IDLE_TIME)
        return;
      lastCheck = Date.now();
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch("/api/release", {
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { version?: unknown };
        if (disposed || typeof body.version !== "string" || !/^[a-f0-9]{40,64}$/.test(body.version))
          return;
        latest = body.version === currentVersion ? null : body.version;
        setAvailable(!!latest);
        applyIfSafe();
      } catch {
        /* Offline or a failed check does not interrupt the current page. */
      } finally {
        clearTimeout(timeout);
        request = null;
      }
    };
    const recheck = () => {
      void check();
    };
    const activityEvents = [
      "pointerdown",
      "keydown",
      "input",
      "touchstart",
      "wheel",
      "scroll",
    ] as const;
    activityEvents.forEach((event) =>
      document.addEventListener(event, rememberActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    window.addEventListener("online", recheck);
    const poll = setInterval(recheck, CHECK_INTERVAL);
    const idle = setInterval(applyIfSafe, 5000);
    recheck();
    return () => {
      disposed = true;
      request?.abort();
      clearInterval(poll);
      clearInterval(idle);
      activityEvents.forEach((event) => document.removeEventListener(event, rememberActivity));
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("online", recheck);
    };
  }, [currentVersion, pathname, reload]);

  return available ? (
    <div className="site-release-notice" role="status">
      <span>Trang đã có bản cập nhật mới.</span>
      <button type="button" onClick={reload}>
        Cập nhật trang
      </button>
    </div>
  ) : null;
}
