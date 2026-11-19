"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale } from "@/shared/i18n/locale-provider";
import type { LoadingKey } from "@/shared/i18n/loading-messages";
import "./loading.css";

type LoadingShape = "cards" | "list" | "messages" | "form" | "none";

function SlowConnectionHint() {
  const { t } = useLocale();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8_000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <span className="moc-loading-patience">{slow ? t("loading.slow") : t("loading.patience")}</span>
  );
}

function LoadingMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`moc-loading-mark${small ? " moc-loading-mark-small" : ""}`}
      aria-hidden="true"
    >
      <span className="moc-loading-orbit" />
      <Image
        src="/brand/moc-maria-official-20261013.webp"
        alt=""
        width={96}
        height={96}
        unoptimized
        loading="eager"
      />
    </span>
  );
}

export function LoadingSkeleton({ shape = "cards" }: { shape?: LoadingShape }) {
  if (shape === "none") return null;
  return (
    <div className={`moc-loading-skeleton moc-loading-${shape}`} aria-hidden="true">
      {Array.from({ length: shape === "form" ? 1 : 4 }, (_, index) => (
        <div className="moc-loading-placeholder" key={index}>
          <span className="moc-loading-avatar" />
          <span className="moc-loading-lines">
            <i />
            <i />
            <i />
          </span>
          <span className="moc-loading-placeholder-footer" />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({
  title,
  description,
  titleKey = "loading.default",
  descriptionKey = "loading.defaultDesc",
  values,
  shape = "none",
  compact = false,
}: {
  title?: string;
  description?: string;
  titleKey?: LoadingKey;
  descriptionKey?: LoadingKey;
  values?: Record<string, string | number>;
  shape?: LoadingShape;
  compact?: boolean;
}) {
  const { locale, t } = useLocale();
  const resolvedDescription = description ?? t(descriptionKey, values);
  return (
    <div className={`moc-loading${compact ? " moc-loading-compact" : ""}`} lang={locale}>
      <div className="moc-loading-status" role="status" aria-live="polite" aria-atomic="true">
        <LoadingMark />
        <span className="moc-loading-eyebrow">MỘC MARIA · WELLNESS LOUNGE</span>
        <p className="moc-loading-title">{title ?? t(titleKey, values)}</p>
        {resolvedDescription && <p className="moc-loading-description">{resolvedDescription}</p>}
        <span className="moc-loading-track" aria-hidden="true">
          <i />
        </span>
        <SlowConnectionHint />
      </div>
      <LoadingSkeleton shape={shape} />
    </div>
  );
}

// Background reads leave the current content and controls available.
export function RefreshNotice({
  label,
  labelKey = "loading.refresh",
}: {
  label?: string;
  labelKey?: LoadingKey;
}) {
  const { locale, t } = useLocale();
  return (
    <div className="moc-loading-refresh" role="status" aria-live="polite" lang={locale}>
      <LoadingMark small />
      <span>{label ?? t(labelKey)}</span>
      <span className="moc-loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export function PendingLabel({
  children,
  message,
}: {
  children?: React.ReactNode;
  message?: LoadingKey;
}) {
  const { locale, t } = useLocale();
  return (
    <span className="moc-loading-action" lang={locale}>
      <span className="moc-loading-action-ring" aria-hidden="true" />
      {message ? t(message) : children}
    </span>
  );
}
