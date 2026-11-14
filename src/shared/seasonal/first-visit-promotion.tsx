"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import "./first-visit-promotion.css";

const SESSION_KEY = "mm:first-visit-99k:v1";
let shownThisDocument = false;

export function FirstVisitPromotionDialog() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (shownThisDocument) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // The document-level guard also works when storage is blocked.
    }
    const timer = window.setTimeout(() => {
      if (
        shownThisDocument ||
        document.querySelector('dialog[open], [aria-modal="true"]') ||
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
      )
        return;
      shownThisDocument = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "seen");
      } catch {
        // Storage is optional.
      }
      setOpen(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      className="mm-first-visit"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        setOpen(false);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          setOpen(false);
      }}
    >
      <div className="mm-first-visit-header">
        <h2 id={titleId}>Ưu đãi trải nghiệm lần đầu</h2>
        <button
          ref={closeButton}
          type="button"
          aria-label="Đóng ưu đãi"
          onClick={() => setOpen(false)}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <picture className="mm-first-visit-poster">
        <source
          type="image/webp"
          srcSet="/promotions/first-visit-99k-v1-768.webp 768w, /promotions/first-visit-99k-v1-1200.webp 1200w"
          sizes="(max-width: 640px) calc(100vw - 24px), 620px"
        />
        <img
          src="/promotions/first-visit-99k-v1-768.jpg"
          width={768}
          height={768}
          loading="eager"
          decoding="async"
          alt="Mộc Maria: chăm sóc chuyên sâu cổ vai gáy, lưng eo, ưu đãi trải nghiệm lần đầu 99K. Ngâm chân thảo dược và tặng một bát chè dưỡng sinh. Đặt lịch 0367 655 183."
        />
      </picture>
      <a className="mm-first-visit-book" href="/dat-lich" onClick={() => setOpen(false)}>
        <CalendarDays size={20} aria-hidden="true" /> Đặt lịch ngay
      </a>
    </dialog>
  );
}
