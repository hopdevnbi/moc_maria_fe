"use client";

import Image from "next/image";
import { useState } from "react";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";

export function KtvTipQr({
  providerId,
  version,
  name,
  onRefresh,
}: {
  providerId: string;
  version: number;
  name: string;
  onRefresh: () => Promise<void>;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function retry() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
      setLoaded(false);
      setFailed(false);
      setAttempt((old) => old + 1);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  const imageUrl = `/api/mobile/provider-tip-qr/${encodeURIComponent(providerId)}?v=${version}&attempt=${attempt}`;

  return (
    <>
      <div className="ktv-tip-qr-frame" aria-busy={!failed && !loaded}>
        {!failed && (
          <Image
            key={attempt}
            src={imageUrl}
            alt={`Mã QR nhận tip do ${name} cung cấp`}
            width={1060}
            height={1400}
            sizes="(max-width: 390px) 72vw, 290px"
            loading="eager"
            unoptimized
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={loaded ? "" : "ktv-tip-qr-pending"}
          />
        )}
        {failed ? (
          <div className="ktv-tip-qr-status" role="alert">
            <strong>Chưa tải được mã QR</strong>
            <p>Bạn có thể thử lại hoặc dùng số tài khoản bên dưới.</p>
            <button type="button" disabled={refreshing} onClick={() => void retry()}>
              <RefreshCw size={17} className={refreshing ? "ktv-tip-spin" : ""} />
              {refreshing ? "Đang tải lại…" : "Tải lại mã QR"}
            </button>
          </div>
        ) : !loaded ? (
          <div className="ktv-tip-qr-status" role="status">
            <LoaderCircle size={24} className="ktv-tip-spin" />
            <span>Đang tải mã QR…</span>
          </div>
        ) : null}
      </div>
      {loaded && !failed && (
        <a
          className="ktv-tip-qr-download"
          href={imageUrl + "&download=1"}
          download="ktv-qr.png"
          aria-label="Tải mã QR"
          title="Tải mã QR"
        >
          <Download size={18} aria-hidden="true" />
        </a>
      )}
    </>
  );
}
