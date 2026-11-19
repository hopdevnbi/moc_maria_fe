"use client";
import { useEffect, useState } from "react";
import { useLocale } from "./locale-provider";
import {
  showcaseTranslationPath,
  validShowcaseTranslation,
  type ShowcaseText,
} from "./showcase-translation";
export function useShowcaseTranslation(id: string, available: boolean) {
  const { locale, enabled } = useLocale();
  const path = enabled && available && locale !== "vi" ? showcaseTranslationPath(id, locale) : null;
  const [snapshot, setSnapshot] = useState<{ path: string; value: ShowcaseText | null } | null>(
    null,
  );
  useEffect(() => {
    if (!path) return;
    let controller: AbortController | undefined;
    async function refresh() {
      if (!path) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      let value: ShowcaseText | null = null;
      try {
        const response = await fetch("/api" + path, {
          cache: "no-store",
          credentials: "omit",
          signal: current.signal,
        });
        if (response.ok) {
          const data: unknown = await response.json();
          if (validShowcaseTranslation(data, id, locale) && data.locale === locale)
            value = data.translation;
        }
      } catch {}
      if (!current.signal.aborted) setSnapshot({ path, value });
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [path, id, locale]);
  return path && snapshot?.path === path ? snapshot.value : null;
}
