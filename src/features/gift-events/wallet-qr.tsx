"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, QrCode, RefreshCcw, ShieldCheck } from "lucide-react";
import type { WalletGift } from "./types";
import "./wallet-qr.css";

type QrResult = { token: string; expiresAt: string; rewardId: string };
type PinResult = { code: string; expiresAt: string; rewardId: string };
export const canGenerateGiftQr = (gift: WalletGift, now: number): boolean =>
  gift.status === "ISSUED" && Date.parse(gift.expiresAt) > now;

export function WalletQr({
  gift,
  authFetch,
}: {
  gift: WalletGift;
  authFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [pinExpiry, setPinExpiry] = useState(0);
  const [expiry, setExpiry] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);
  const validToken = qrImage && expiry > now && now > 0;
  const validPin = pin && pinExpiry > now && now > 0;
  const isRedeemable = canGenerateGiftQr(gift, now);

  async function generate() {
    if (!canGenerateGiftQr(gift, Date.now()) || loading) return;
    setQrImage(null);
    setError("");
    setLoading(true);
    try {
      const result = await authFetch<QrResult>(`/gift-events/me/rewards/${gift.id}/qr`, {
        method: "POST",
        cache: "no-store",
      });
      if (result.rewardId !== gift.id || Date.parse(result.expiresAt) <= Date.now())
        throw new Error("Phiếu không hợp lệ.");
      const { toDataURL } = await import("qrcode");
      const image = await toDataURL(result.token, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 240,
        color: { dark: "#173b2d", light: "#ffffff" },
      });
      setExpiry(Date.parse(result.expiresAt));
      setNow(Date.now());
      setQrImage(image);
    } catch {
      setError("Chưa thể cấp QR. Vui lòng kiểm tra kết nối hoặc liên hệ quầy.");
    } finally {
      setLoading(false);
    }
  }
  async function generatePin() {
    if (!canGenerateGiftQr(gift, Date.now()) || loading) return;
    setLoading(true);
    setError("");
    setPin(null);
    try {
      const result = await authFetch<PinResult>(`/gift-events/me/rewards/${gift.id}/code`, {
        method: "POST",
        cache: "no-store",
      });
      if (
        result.rewardId !== gift.id ||
        !/^\d{6}$/.test(result.code) ||
        Date.parse(result.expiresAt) <= Date.now()
      )
        throw new Error("INVALID_CODE");
      setPin(result.code);
      setPinExpiry(Date.parse(result.expiresAt));
      setNow(Date.now());
    } catch {
      setError("Không thể cấp mã 6 số lúc này. Vui lòng dùng QR hoặc hỏi nhân viên.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mm-ev-qr-panel" aria-live="polite">
      <strong>
        <QrCode size={18} /> Mã nhận quà bảo mật
      </strong>
      <p>
        Mã chỉ xuất hiện trên thiết bị của bạn, hết hạn tối đa 5 phút và không tự xác nhận đã nhận
        quà.
      </p>
      {validToken && (
        <div className="mm-ev-qr-preview">
          {/* Generated locally; no external image server sees the token. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImage}
            width={240}
            height={240}
            alt="Mã QR nhận quà cho nhân viên Mộc Maria quét"
          />
          <span>
            <LockKeyhole size={14} /> Còn {Math.ceil((expiry - now) / 1000)} giây
          </span>
        </div>
      )}
      {validPin && (
        <div className="mm-ev-qr-preview" role="status">
          <strong style={{ fontSize: 30, letterSpacing: 6, fontVariantNumeric: "tabular-nums" }}>
            {pin?.slice(0, 3)} {pin?.slice(3)}
          </strong>
          <span>
            <LockKeyhole size={14} /> Đọc mã cho nhân viên trong{" "}
            {Math.ceil((pinExpiry - now) / 1000)} giây
          </span>
        </div>
      )}
      {!isRedeemable && <p role="status">Quà đã hết hạn hoặc không còn đủ điều kiện đổi.</p>}
      {error && (
        <p role="alert" className="mm-ev-qr-error">
          {error}
        </p>
      )}
      {isRedeemable && (
        <>
          <button
            type="button"
            className="mm-ev-qr-button"
            onClick={() => void generate()}
            disabled={loading}
          >
            {validToken ? <RefreshCcw size={16} /> : <QrCode size={16} />}
            {loading
              ? "Đang cấp mã…"
              : validToken
                ? "Cấp mã mới (hủy mã cũ)"
                : "Tạo mã QR nhận quà"}
          </button>
          <button
            type="button"
            className="mm-ev-qr-button"
            onClick={() => void generatePin()}
            disabled={loading}
          >
            {loading ? "Đang cấp mã…" : "Lấy mã 6 số để đọc tại quầy"}
          </button>
        </>
      )}
      <small>
        <ShieldCheck size={14} /> Chỉ nhân viên có quyền tại cơ sở được chỉ định mới xác nhận nhận
        quà.
      </small>
    </div>
  );
}
