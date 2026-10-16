"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

type DetectedCode = { rawValue: string };
type NativeDetector = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>;
};

/** Camera frames remain local to the browser; only the extracted short-lived token is verified. */
export function GiftQrScanner({
  onRead,
  disabled = false,
}: {
  onRead: (token: string) => void;
  disabled?: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  useEffect(() => {
    if (!scanning || disabled) return;
    let cancelled = false;
    let animation = 0;
    let stream: MediaStream | undefined;
    const videoEl = videoRef.current;
    async function start() {
      try {
        const Detector = (window as unknown as { BarcodeDetector?: NativeDetector }).BarcodeDetector;
        if (!Detector) {
          setCameraError(
            "Trình duyệt chưa hỗ trợ nhận diện QR từ camera. Hãy dùng máy quét hoặc nhập mã 6 số.",
          );
          setScanning(false);
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("CAMERA_UNAVAILABLE");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoEl;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });
        const poll = async () => {
          if (cancelled || !video) return;
          try {
            const found = await detector.detect(video);
            const token = found
              .map((code) => code.rawValue.trim())
              .find((value) => /^[A-Za-z0-9_-]{43}$/.test(value));
            if (token) {
              onReadRef.current(token);
              setScanning(false);
              return;
            }
          } catch {
            // A frame may not be ready yet; keep scanning.
          }
          if (!cancelled) animation = requestAnimationFrame(() => void poll());
        };
        void poll();
      } catch {
        setCameraError("Không thể mở camera. Kiểm tra quyền camera và kết nối HTTPS.");
        setScanning(false);
      }
    }
    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, [scanning, disabled]);

  return (
    <div className="mm-gc-scanner">
      <button
        type="button"
        className="mm-gc-camera-button"
        disabled={disabled}
        onClick={() => {
          setCameraError("");
          setScanning((value) => !value);
        }}
      >
        {scanning ? <CameraOff size={17} /> : <Camera size={17} />}
        {scanning ? "Tắt camera" : "Quét QR bằng camera"}
      </button>
      {scanning && (
        <div className="mm-gc-camera-preview">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Camera quét mã QR voucher" />
          <small>Giữ mã QR của khách trong khung hình. Máy sẽ tự xác minh khi nhận được mã.</small>
        </div>
      )}
      {cameraError && <p className="mm-gc-error" role="alert">{cameraError}</p>}
    </div>
  );
}
