"use client";

import { LOCALE_COOKIE, LOCALES, normalizeLocale, type Locale } from "./locale";
import { translate } from "./messages";

const names: Record<Locale, string> = {
  vi: "🇻🇳 Tiếng Việt",
  en: "🇬🇧 English",
  ko: "🇰🇷 한국어",
  ja: "🇯🇵 日本語",
  "zh-CN": "🇨🇳 简体中文",
  ru: "🇷🇺 Русский",
};

export function LanguageSelector({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <label>
      <span>{translate(locale, "language.label")}</span>
      <select
        value={locale}
        onChange={(event) => {
          const next = normalizeLocale(event.target.value);
          if (!next) return;
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie =
            LOCALE_COOKIE +
            "=" +
            encodeURIComponent(next) +
            "; Path=/; Max-Age=31536000; SameSite=Lax" +
            secure;
          onChange(next);
        }}
      >
        {LOCALES.map((key) => (
          <option key={key} value={key} lang={key}>
            {names[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
