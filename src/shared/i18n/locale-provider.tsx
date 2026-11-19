"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale, type Locale } from "./locale";
import { translate, type MessageKey } from "./messages";

const fallback = {
  locale: DEFAULT_LOCALE as Locale,
  enabled: false,
  setLocale: (() => {}) as (locale: Locale) => void,
  resetLocale: () => {},
};
const LocaleContext = createContext(fallback);

function readManual() {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(LOCALE_COOKIE + "="));
  return normalizeLocale(value?.slice(LOCALE_COOKIE.length + 1));
}

function saveManual(locale?: Locale) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    LOCALE_COOKIE +
    "=" +
    (locale ?? "") +
    "; Path=/; Max-Age=" +
    (locale ? 31536000 : 0) +
    "; SameSite=Lax" +
    secure;
}

export function LocaleProvider({
  children,
  enabled = process.env.NEXT_PUBLIC_MOC_I18N_PREVIEW === "1" ||
    process.env.NODE_ENV === "development",
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [locale, update] = useState<Locale>(DEFAULT_LOCALE);
  const generation = useRef(0);
  const detect = useCallback(async () => {
    const id = ++generation.current;
    const saved = readManual();
    if (saved) {
      update(saved);
      return;
    }
    try {
      const response = await fetch("/api/locale", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const data: unknown = await response.json();
      const next = normalizeLocale(
        typeof data === "object" && data !== null && "locale" in data ? data.locale : undefined,
      );
      if (id === generation.current && next && !readManual()) update(next);
    } catch {
      /* offline: keep Vietnamese or the previous choice */
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    // Defer discovery until hydration to preserve the cached Vietnamese server shell.
    const timer = window.setTimeout(() => {
      void detect();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      generation.current += 1;
    };
  }, [enabled, detect]);
  useEffect(() => {
    if (!enabled) return;
    // Only translated strings receive their own lang until all pages are localized.
    document.documentElement.dataset.mocLocale = locale;
    return () => {
      delete document.documentElement.dataset.mocLocale;
    };
  }, [locale, enabled]);
  const setLocale = useCallback(
    (next: Locale) => {
      if (!enabled || !normalizeLocale(next)) return;
      generation.current += 1;
      saveManual(next);
      update(next);
    },
    [enabled],
  );
  const resetLocale = useCallback(() => {
    if (!enabled) return;
    saveManual();
    update(DEFAULT_LOCALE);
    void detect();
  }, [enabled, detect]);
  return (
    <LocaleContext.Provider
      value={{ locale: enabled ? locale : DEFAULT_LOCALE, enabled, setLocale, resetLocale }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  return {
    ...context,
    t: (key: MessageKey, values?: Record<string, string | number>) => {
      const text = translate(context.locale, key);
      return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        values?.[name] == null ? placeholder : String(values[name]),
      );
    },
  };
}
