"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "./loading.css";

type LoadingShape = "cards" | "list" | "messages" | "form" | "none";

function SlowConnectionHint() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8_000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <span className="moc-loading-patience">
      {slow
        ? "Kết nối đang chậm hơn thường lệ. Bạn có thể tiếp tục chờ hoặc thử tải lại trang."
        : "Mộc chăm chút từng trải nghiệm của bạn."}
    </span>
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
  title = "Mộc đang chuẩn bị cho bạn",
  description = "Đang tải thông tin mới nhất từ Mộc Maria.",
  shape = "none",
  compact = false,
}: {
  title?: string;
  description?: string;
  shape?: LoadingShape;
  compact?: boolean;
}) {
  return (
    <div className={`moc-loading${compact ? " moc-loading-compact" : ""}`}>
      <div className="moc-loading-status" role="status" aria-live="polite" aria-atomic="true">
        <LoadingMark />
        <span className="moc-loading-eyebrow">MỘC MARIA · WELLNESS LOUNGE</span>
        <p className="moc-loading-title">{title}</p>
        {description && <p className="moc-loading-description">{description}</p>}
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
export function RefreshNotice({ label = "Đang cập nhật thông tin mới nhất…" }: { label?: string }) {
  return (
    <div className="moc-loading-refresh" role="status" aria-live="polite">
      <LoadingMark small />
      <span>{label}</span>
      <span className="moc-loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export function PendingLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="moc-loading-action">
      <span className="moc-loading-action-ring" aria-hidden="true" />
      {children}
    </span>
  );
}
