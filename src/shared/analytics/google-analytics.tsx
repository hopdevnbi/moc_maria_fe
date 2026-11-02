"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsPage } from "./analytics";

export function GoogleAnalytics({ measurementId }: { measurementId: string | undefined }) {
  const pathname = usePathname();
  useEffect(() => {
    // The event hostname rewrites / to /event; report the visible browser route.
    if (pathname) trackAnalyticsPage(window.location.pathname, measurementId);
  }, [pathname, measurementId]);
  return null;
}
