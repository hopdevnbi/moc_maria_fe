"use client";
import { LOCALES, normalizeLocale, type Locale } from "./locale";
import { useLocale } from "./locale-provider";
import "./language-selector.css";

const names: Record<Locale, string> = {
  vi: "🇻🇳 Tiếng Việt",
  en: "🇬🇧 English",
  ko: "🇰🇷 한국어",
  ja: "🇯🇵 日本語",
  "zh-CN": "🇨🇳 简体中文",
  ru: "🇷🇺 Русский",
};
const flags: Record<Locale, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
  ko: "🇰🇷",
  ja: "🇯🇵",
  "zh-CN": "🇨🇳",
  ru: "🇷🇺",
};
export function LanguageSelector() {
  const { locale, enabled, setLocale, resetLocale, t } = useLocale();
  if (!enabled) return null;
  return (
    <label className="moc-language-selector" lang={locale}>
      <span aria-hidden="true">
        {flags[locale]}{" "}
        <span className="moc-language-code">
          {locale === "zh-CN" ? "ZH" : locale.toUpperCase()}
        </span>{" "}
        ▾
      </span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => {
          if (event.target.value === "auto") {
            resetLocale();
            return;
          }
          const next = normalizeLocale(event.target.value);
          if (next) setLocale(next);
        }}
      >
        {LOCALES.map((key) => (
          <option key={key} value={key} lang={key}>
            {names[key]}
          </option>
        ))}
        <option value="auto">{t("language.automatic")}</option>
      </select>
    </label>
  );
}
