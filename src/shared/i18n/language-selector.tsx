"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { LOCALES, type Locale } from "./locale";
import { useLocale } from "./locale-provider";
import "./language-selector.css";

const names: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ko: "한국어",
  ja: "日本語",
  "zh-CN": "简体中文",
  ru: "Русский",
};
const codes: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
  ko: "KO",
  ja: "JA",
  "zh-CN": "ZH",
  ru: "RU",
};
const star =
  "0,-10 2.94,-3.09 9.51,-3.09 4.76,1.55 5.88,8.09 0,4 -5.88,8.09 -4.76,1.55 -9.51,-3.09 -2.94,-3.09";
function Flag({ locale }: { locale: Locale }) {
  return (
    <svg
      className="moc-language-flag"
      viewBox="0 0 60 40"
      aria-hidden="true"
      focusable="false"
      data-flag={locale}
    >
      {locale === "vi" ? (
        <>
          <path fill="#da251d" d="M0 0h60v40H0z" />
          <polygon fill="#ffdf00" points={star} transform="translate(30 20) scale(1.25)" />
        </>
      ) : locale === "en" ? (
        <>
          <path fill="#012169" d="M0 0h60v40H0z" />
          <path stroke="#fff" strokeWidth="8" d="m0 0 60 40M60 0 0 40" />
          <path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40M60 0 0 40" />
          <path stroke="#fff" strokeWidth="12" d="M30 0v40M0 20h60" />
          <path stroke="#c8102e" strokeWidth="7" d="M30 0v40M0 20h60" />
        </>
      ) : locale === "ja" ? (
        <>
          <path fill="#fff" d="M0 0h60v40H0z" />
          <circle cx="30" cy="20" r="12" fill="#bc002d" />
        </>
      ) : locale === "ru" ? (
        <>
          <path fill="#fff" d="M0 0h60v14H0z" />
          <path fill="#0039a6" d="M0 13.33h60v13.34H0z" />
          <path fill="#d52b1e" d="M0 26.67h60V40H0z" />
        </>
      ) : locale === "zh-CN" ? (
        <>
          <path fill="#de2910" d="M0 0h60v40H0z" />
          <g fill="#ffde00">
            <polygon points={star} transform="translate(11 10) scale(.65)" />
            {[
              [21, 4, 20],
              [25, 8, 35],
              [25, 14, 0],
              [20, 18, 20],
            ].map(([x, y, r]) => (
              <polygon
                key={y}
                points={star}
                transform={`translate(${x} ${y}) rotate(${r}) scale(.22)`}
              />
            ))}
          </g>
        </>
      ) : (
        <>
          <path fill="#fff" d="M0 0h60v40H0z" />
          <g transform="translate(30 20) rotate(33)">
            <path fill="#cd2e3a" d="M-10 0a10 10 0 0 1 20 0a5 5 0 0 1-10 0A5 5 0 0 0-10 0Z" />
            <path fill="#0047a0" d="M-10 0a5 5 0 0 1 10 0a5 5 0 0 0 10 0a10 10 0 0 1-20 0Z" />
          </g>
          <g stroke="#151515" strokeWidth="2.4">
            <path d="m10 13 6-9m-3 11 6-9m-3 11 6-9M44 4l3 4m1 2 3 4m-4-12 3 4m1 2 3 4m-10-4 6 9M10 27l6 9m-3-11 3 4m1 2 3 4m-4-12 6 9M44 36l3-4m1-2 3-4m-4 12 3-4m1-2 3-4m-10 1 3-4m1-2 3-4" />
          </g>
        </>
      )}
    </svg>
  );
}
export function LanguageSelector() {
  const { locale, enabled, setLocale, resetLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  if (!enabled) return null;
  return (
    <div
      className="moc-language-selector"
      lang={locale}
      ref={root}
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="moc-language-trigger"
        ref={trigger}
        aria-label={t("language.label") + ": " + names[locale]}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Flag locale={locale} />
        <span className="moc-language-code">{codes[locale]}</span>
        <ChevronDown size={14} aria-hidden="true" className="moc-language-chevron" />
      </button>
      {open && (
        <div
          className="moc-language-panel"
          id={id}
          ref={panel}
          role="group"
          aria-label={t("language.label")}
        >
          <div className="moc-language-heading">
            <Globe2 size={17} aria-hidden="true" />
            <strong>{t("language.label")}</strong>
          </div>
          <div className="moc-language-options">
            {LOCALES.map((key) => (
              <button
                type="button"
                key={key}
                lang={key}
                aria-pressed={locale === key}
                className="moc-language-option"
                onClick={() => {
                  setLocale(key);
                  close();
                }}
              >
                <Flag locale={key} />
                <span>{names[key]}</span>
                {locale === key && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="moc-language-auto"
            onClick={() => {
              resetLocale();
              close();
            }}
          >
            <Globe2 size={17} aria-hidden="true" />
            {t("language.automatic")}
          </button>
        </div>
      )}
    </div>
  );
}
