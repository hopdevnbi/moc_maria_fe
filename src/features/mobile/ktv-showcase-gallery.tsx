"use client";

import Image from "next/image";
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
  if (item.kind === "VIDEO") {
    return (
      <video
        key={item.id}
        controls
        playsInline
        preload="metadata"
        className={"ktv-showcase-media-video" + (expanded ? " ktv-showcase-media-expanded" : "")}
        aria-label={item.caption || `Video giới thiệu ${name}`}
      >
        <source src={item.url} type="video/mp4" />
        Trình duyệt không hỗ trợ xem video này.
      </video>
    );
  }
  return (
    <Image
      key={item.id}
      src={item.url}
      alt={item.caption || `Hình ảnh hoạt động của ${name}`}
      width={expanded ? 1400 : 1100}
      height={expanded ? 950 : 700}
      sizes={expanded ? "95vw" : "(max-width: 700px) 100vw, 1020px"}
      unoptimized
    />
  );
}

export function KtvShowcaseGallery({ media, name }: { media: KtvShowcaseMedia[]; name: string }) {
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
            aria-label="Mở ảnh toàn màn hình"
            onClick={() => setExpanded(true)}
          >
            <Expand size={18} />
          </button>
        )}
        {media.length > 1 && (
          <div className="ktv-showcase-gallery-navigation">
            <button
              type="button"
              aria-label="Ảnh hoặc video trước"
              onClick={() => setActive((old) => (old - 1 + media.length) % media.length)}
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              {active + 1} / {media.length}
            </span>
            <button
              type="button"
              aria-label="Ảnh hoặc video tiếp theo"
              onClick={() => setActive((old) => (old + 1) % media.length)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      {(current.caption || media.length > 1) && (
        <div className="ktv-showcase-gallery-foot">
          <p>{current.caption || "Hình ảnh và video tại Mộc Maria"}</p>
          {media.length > 1 && <span>Chọn ảnh bên dưới để xem</span>}
        </div>
      )}
      {media.length > 1 && (
        <div
          className="ktv-showcase-gallery-thumbs"
          role="group"
          aria-label="Chọn hình ảnh hoặc video"
        >
          {media.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={"ktv-showcase-gallery-thumb" + (index === active ? " is-active" : "")}
              aria-label={`${item.kind === "VIDEO" ? "Video" : "Hình ảnh"} ${index + 1}: ${item.caption || name}`}
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
          aria-label={`Hình ảnh ${name}`}
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="ktv-showcase-lightbox-close"
            aria-label="Đóng ảnh"
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
