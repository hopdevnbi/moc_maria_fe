"use client";
import { useEffect, useMemo, useState } from "react";
import { catalogTranslationPath, validTranslation, type CatalogKind } from "./catalog-translation";
import type { CatalogTranslation } from "./catalog-translation";
import { useLocale } from "./locale-provider";
export function useCatalogTranslations(kind: CatalogKind, ids: readonly string[]) {
  const { locale, enabled } = useLocale();
  const key =
    enabled && locale !== "vi"
      ? Array.from(new Set(ids.filter((id) => catalogTranslationPath(kind, id, locale))))
          .sort()
          .join(",")
      : "";
  const identity = kind + ":" + locale + ":" + key;
  const [snapshot, setSnapshot] = useState<{
    identity: string;
    items: Record<string, CatalogTranslation>;
  }>({ identity: "", items: {} });
  useEffect(() => {
    if (!key) return;
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const list = await Promise.all(
        key.split(",").map(async (id) => {
          try {
            const response = await fetch("/api" + catalogTranslationPath(kind, id, locale), {
              signal: current.signal,
              cache: "no-store",
              credentials: "omit",
            });
            if (!response.ok) return null;
            const data: unknown = await response.json();
            return validTranslation(data, kind, id, locale) && data.locale === locale ? data : null;
          } catch {
            return null;
          }
        }),
      );
      if (!current.signal.aborted)
        setSnapshot({
          identity,
          items: Object.fromEntries(
            list.filter((d): d is CatalogTranslation => d !== null).map((d) => [d.entityId, d]),
          ),
        });
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
  }, [identity, key, kind, locale]);
  return useMemo(
    () => (snapshot.identity === identity ? snapshot.items : {}),
    [snapshot, identity],
  );
}
export function useCatalogTranslation(kind: CatalogKind, id?: string) {
  const result = useCatalogTranslations(kind, id ? [id] : []);
  return id ? (result[id] ?? null) : null;
}
