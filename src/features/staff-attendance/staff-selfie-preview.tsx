"use client";

import { useState } from "react";
import { CameraOff, RefreshCw } from "lucide-react";

/** Direct CDN first; use the same-origin Next optimizer if mobile/PWA blocks it. */
export function StaffSelfiePreview({ url, date }: { url: string; date: string }) {
  const [source, setSource] = useState<"cdn" | "site" | "failed">("cdn");
  const [attempt, setAttempt] = useState(0);
  const direct = attempt === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}retry=${attempt}`;
  const viaSite = `/_next/image?url=${encodeURIComponent(url)}&w=750&q=75`;

  return (
    <figure className="mm-att-selfie-photo">
      {source !== "failed" ? (
        // eslint-disable-next-line @next/next/no-img-element -- Intentional direct CDN -> same-origin fallback for mobile/PWA.
        <img
          src={source === "cdn" ? direct : viaSite}
          alt={`Ảnh selfie điểm danh ngày ${date}`}
          width={720}
          height={960}
          loading="eager"
          decoding="async"
          onError={() => setSource((previous) => (previous === "cdn" ? "site" : "failed"))}
        />
      ) : (
        <div className="mm-att-selfie-photo-error" role="alert">
          <CameraOff size={25} aria-hidden="true" />
          <strong>Chưa tải được ảnh trên thiết bị này</strong>
          <span>Ảnh đã lưu trên CDN. Bạn có thể mở ảnh gốc hoặc tải lại.</span>
          <button
            type="button"
            onClick={() => {
              setAttempt((old) => old + 1);
              setSource("cdn");
            }}
          >
            <RefreshCw size={15} aria-hidden="true" /> Thử tải lại
          </button>
        </div>
      )}
      <figcaption>Một ảnh xác nhận · {date}</figcaption>
    </figure>
  );
}
