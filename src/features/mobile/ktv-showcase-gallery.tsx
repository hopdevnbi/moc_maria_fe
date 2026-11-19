"use client";

import Image from "next/image";
import { useLocale } from "@/shared/i18n/locale-provider";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Play, X } from "lucide-react";
import type { KtvShowcaseMedia } from "./ktv-showcase-types";

function MediaView({
  item,
  name,
  expanded = false,
}: {
  item: KtvShowcaseMedia;
  name: string;
  expanded?: boolean;
}) {
  const { t } = useLocale();
  if (item.kind === "VIDEO") {
    return (
      <video
        key={item.id}
        controls
        autoPlay
        muted
        playsInline
        preload="metadata"
        className={"ktv-showcase-media-video" + (expanded ? " ktv-showcase-media-expanded" : "")}
        aria-label={item.caption || t("gallery.video", { name })}
      >
        <source src={item.url} type="video/mp4" />
        {t("gallery.unsupported")}
      </video>
    );
  }
  return (
    <Image
      key={item.id}
      src={item.url}
      alt={item.caption || t("gallery.image", { name })}
      width={expanded ? 1400 : 1100}
      height={expanded ? 950 : 700}
      sizes={expanded ? "95vw" : "(max-width: 700px) 100vw, 1020px"}
      unoptimized
    />
  );
}

export function KtvShowcaseGallery({ media, name }: { media: KtvShowcaseMedia[]; name: string }) {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const current = media[Math.min(active, media.length - 1)];

  useEffect(() => {
    if (!expanded) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft") setActive((old) => (old - 1 + media.length) % media.length);
      if (event.key === "ArrowRight") setActive((old) => (old + 1) % media.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prior;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, media.length]);

  if (!current) return null;
  return (
    <div className="ktv-showcase-gallery">
      <div className="ktv-showcase-gallery-stage">
        <MediaView item={current} name={name} />
        {current.kind === "IMAGE" && (
          <button
            className="ktv-showcase-gallery-expand"
            type="button"
            aria-label={t("gallery.expand")}
            onClick={() => setExpanded(true)}
          >
            <Expand size={18} />
          </button>
        )}
      </div>
      {(current.caption || media.length > 1) && (
        <div className="ktv-showcase-gallery-foot">
          <p>{current.caption || t("gallery.default")}</p>
          {media.length > 1 && (
            <div className="ktv-showcase-gallery-navigation">
              <button
                type="button"
                aria-label={t("gallery.prev")}
                onClick={() => setActive((old) => (old - 1 + media.length) % media.length)}
              >
                <ChevronLeft size={20} />
              </button>
              <span>
                {active + 1} / {media.length}
              </span>
              <button
                type="button"
                aria-label={t("gallery.next")}
                onClick={() => setActive((old) => (old + 1) % media.length)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
      {media.length > 1 && (
        <div className="ktv-showcase-gallery-thumbs" role="group" aria-label={t("gallery.select")}>
          {media.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={"ktv-showcase-gallery-thumb" + (index === active ? " is-active" : "")}
              aria-label={t(item.kind === "VIDEO" ? "gallery.videoIndex" : "gallery.imageIndex", {
                n: index + 1,
                name: item.caption || name,
              })}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              {item.kind === "IMAGE" ? (
                <Image src={item.url} width={100} height={80} alt="" unoptimized />
              ) : (
                <span className="ktv-showcase-gallery-video-thumb">
                  <Play size={20} fill="currentColor" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {expanded && current.kind === "IMAGE" && (
        <div
          className="ktv-showcase-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("gallery.dialog", { name })}
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="ktv-showcase-lightbox-close"
            aria-label={t("gallery.close")}
            onClick={() => setExpanded(false)}
          >
            <X size={23} />
          </button>
          <div onClick={(event) => event.stopPropagation()}>
            <MediaView item={current} name={name} expanded />
          </div>
          {current.caption && <p>{current.caption}</p>}
        </div>
      )}
    </div>
  );
}
