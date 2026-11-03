"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Gift, Sparkles, X } from "lucide-react";
import type { NoelPromotion } from "./noel-promotion-data";
import "./noel-promotion.css";

const EVENT_URL = "https://event.mocmaria.com/#vuon-qua";
// Browser-only writes from effects; also avoids repeats when storage is blocked.
const shownThisDocument = new Set<string>();

export function NoelPromotionDialog({ promotion }: { promotion: NoelPromotion }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const detailId = useId();

  useEffect(() => {
    const key = `mm:noel-promotion:2026:${promotion.id}`;
    if (shownThisDocument.has(key) || Date.parse(promotion.endsAt) <= Date.now()) return;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* In-memory frequency guard remains available. */
    }
    const timer = window.setTimeout(() => {
      if (
        Date.parse(promotion.endsAt) <= Date.now() ||
        document.querySelector('dialog[open], [aria-modal="true"]') ||
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
      )
        return;
      shownThisDocument.add(key);
      try {
        sessionStorage.setItem(key, "seen");
      } catch {
        /* Storage is optional. */
      }
      setOpen(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [promotion.id, promotion.endsAt]);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      className="mm-noel-promotion"
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={detailId}
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
      <button
        className="mm-noel-close"
        type="button"
        aria-label="Đóng giới thiệu quà Noel"
        onClick={() => setOpen(false)}
      >
        <X size={22} />
      </button>
      <a
        className="mm-noel-art"
        href={EVENT_URL}
        aria-label="Khám phá chương trình Noel tại Mộc Maria"
      >
        <span className="mm-noel-stars" aria-hidden="true">
          ✧ · ✦ · ✧
        </span>
        <Image
          src="/event/gift-boxes/gift-1-320.webp"
          width={190}
          height={190}
          alt="Hộp quà Noel Mộc Maria"
          loading="eager"
        />
        <span>MỘC MARIA · NOEL 2026</span>
      </a>
      <div className="mm-noel-content">
        <div className="mm-noel-heading">
          <span>
            <Sparkles size={14} /> MỘT MÙA AN LÀNH, THÊM NIỀM VUI
          </span>
          <h2 ref={heading} id={titleId} tabIndex={-1}>
            Quà Noel
            <br />
            <em>đang chờ bạn.</em>
          </h2>
        </div>
        <a
          className="mm-noel-offers"
          href={EVENT_URL}
          aria-label="Xem voucher đến 50% và quà Noel đến 5 triệu đồng"
        >
          <div>
            <span>VOUCHER ƯU ĐÃI</span>
            <small>lên đến</small>
            <strong>
              50<span>%</span>
            </strong>
          </div>
          <div className="mm-noel-cash">
            <span>QUÀ NOEL ĐẶC BIỆT</span>
            <small>lên đến</small>
            <strong>5 triệu</strong>
            <small>VNĐ · theo thể lệ riêng</small>
          </div>
        </a>
        <p id={detailId} className="mm-noel-description">
          Chọn một hộp quà, nhận thêm niềm vui và hẹn một buổi thảnh thơi cùng Mộc.
        </p>
        <p className="mm-noel-conditions">
          Voucher và quà Noel áp dụng điều kiện riêng. Xem thể lệ chương trình tại trang sự kiện.
        </p>
        <div className="mm-noel-actions">
          <a href={EVENT_URL}>
            <Gift size={18} /> Khám phá quà Noel <ArrowUpRight size={18} />
          </a>
          <button type="button" onClick={() => setOpen(false)}>
            Tôi sẽ xem sau
          </button>
        </div>
      </div>
    </dialog>
  );
}
