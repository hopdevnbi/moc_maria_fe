"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Ellipsis,
  Plus,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import {
  canUsePwaOnHost,
  detectInstallPlatform,
  hasInstalledPwa,
  isEmbeddedSocialBrowser,
  isPwaInviteSnoozed,
  mayInviteOnRoute,
  PWA_DISMISSED_KEY,
  PWA_DISMISS_MS,
  PWA_INVITED_KEY,
  PWA_OPEN_EVENT,
  type InstallPlatform,
} from "./pwa-install-utils";
import "./pwa-install.css";

type InstallChoice = { outcome: "accepted" | "dismissed" };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export function PwaInstallAssistant() {
  return (
    <Suspense fallback={null}>
      <PwaInstallAssistantContent />
    </Suspense>
  );
}

function PwaInstallAssistantContent() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [socialBrowser, setSocialBrowser] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [installed, setInstalled] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const deferred = useRef<InstallPromptEvent | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const detailId = useId();

  useEffect(() => {
    if (!canUsePwaOnHost(window.location.hostname)) return;
    const standalone = window.matchMedia?.("(display-mode: standalone)");
    const init = window.setTimeout(() => {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      setPlatform(detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints));
      setSocialBrowser(isEmbeddedSocialBrowser(navigator.userAgent));
      setInstalled(hasInstalledPwa(standalone?.matches ?? false, iosStandalone));
      try {
        setSnoozed(isPwaInviteSnoozed(localStorage.getItem(PWA_DISMISSED_KEY), Date.now()));
      } catch {
        // Still allow the manual install action when browser storage is unavailable.
      }
      setReady(true);
    }, 0);

    const onInstallable = (event: Event) => {
      event.preventDefault();
      deferred.current = event as InstallPromptEvent;
      setHasNativePrompt(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setHasNativePrompt(false);
      setInstalled(true);
      setTeaser(false);
      setOpen(false);
    };
    const onModeChange = () => {
      if (standalone?.matches) onInstalled();
    };
    const onManualOpen = () => {
      if (
        hasInstalledPwa(
          standalone?.matches ?? false,
          (navigator as Navigator & { standalone?: boolean }).standalone,
        )
      )
        return;
      setTeaser(false);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(PWA_OPEN_EVENT, onManualOpen);
    standalone?.addEventListener?.("change", onModeChange);

    // Register a deliberately network-only service worker. Bookings/chat/API are NEVER cached.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const register = () =>
        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
      return () => {
        window.clearTimeout(init);
        window.removeEventListener("beforeinstallprompt", onInstallable);
        window.removeEventListener("appinstalled", onInstalled);
        window.removeEventListener(PWA_OPEN_EVENT, onManualOpen);
        window.removeEventListener("load", register);
        standalone?.removeEventListener?.("change", onModeChange);
      };
    }
    return () => {
      window.clearTimeout(init);
      window.removeEventListener("beforeinstallprompt", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(PWA_OPEN_EVENT, onManualOpen);
      standalone?.removeEventListener?.("change", onModeChange);
    };
  }, []);

  useEffect(() => {
    if (
      !ready ||
      installed ||
      snoozed ||
      platform === "desktop" ||
      !mayInviteOnRoute(pathname) ||
      !window.matchMedia?.("(max-width: 800px)")?.matches
    )
      return;

    try {
      if (sessionStorage.getItem(PWA_INVITED_KEY)) return;
    } catch {
      // No session storage: a dismiss remains possible for this page.
    }

    let engaged = false;
    let delayPassed = false;
    const check = () => {
      if (
        !engaged ||
        !delayPassed ||
        document.visibilityState === "hidden" ||
        document.querySelector(
          'dialog[open], [aria-modal="true"], input:focus, textarea:focus, [contenteditable="true"]:focus',
        )
      )
        return;
      setTeaser(true);
      try {
        sessionStorage.setItem(PWA_INVITED_KEY, "1");
      } catch {
        // This does not prevent the invitation from being dismissed.
      }
      window.clearInterval(recheck);
    };
    const onEngage = () => {
      engaged = true;
      check();
    };
    const timer = window.setTimeout(() => {
      delayPassed = true;
      check();
    }, 14_000);
    const recheck = window.setInterval(check, 3_000);
    window.addEventListener("pointerdown", onEngage, { passive: true });
    window.addEventListener("scroll", onEngage, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(recheck);
      window.removeEventListener("pointerdown", onEngage);
      window.removeEventListener("scroll", onEngage);
    };
  }, [ready, installed, snoozed, platform, pathname]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const oldFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (oldFocus?.isConnected) oldFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!ready || installed) return null;

  const snooze = () => {
    setTeaser(false);
    setOpen(false);
    setSnoozed(true);
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, String(Date.now() + PWA_DISMISS_MS));
    } catch {
      // In-memory dismissal still lasts for the current visit.
    }
  };
  const launchNative = async () => {
    if (!deferred.current || prompting) return;
    const event = deferred.current;
    deferred.current = null;
    setHasNativePrompt(false);
    setPrompting(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setTeaser(false);
        setOpen(false);
      } else {
        snooze();
      }
    } catch {
      // Browser may expire the event; manual instructions remain usable below.
    } finally {
      setPrompting(false);
    }
  };
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText("https://mocmaria.com/");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <>
      {teaser && !open && mayInviteOnRoute(pathname) && (
        <aside className="mm-pwa-teaser" aria-label="Cài đặt Mộc Maria">
          <Image src="/pwa/icon-192.png" alt="" width={47} height={47} unoptimized />
          <div className="mm-pwa-teaser-copy">
            <strong>Mộc Maria trên điện thoại</strong>
            <span>Mở nhanh từ màn hình chính.</span>
            <button
              type="button"
              onClick={() => {
                setTeaser(false);
                setOpen(true);
              }}
            >
              Cài ứng dụng <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <button
            className="mm-pwa-teaser-close"
            type="button"
            aria-label="Để sau, ẩn lời mời cài ứng dụng"
            onClick={snooze}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      )}

      {open && (
        <dialog
          ref={dialogRef}
          className="mm-pwa-dialog"
          aria-labelledby={headingId}
          aria-describedby={detailId}
          onCancel={(event) => {
            event.preventDefault();
            snooze();
          }}
        >
          <div className="mm-pwa-dialog-head">
            <Image
              src="/pwa/icon-192.png"
              width={69}
              height={69}
              alt="Biểu tượng Mộc Maria"
              unoptimized
            />
            <button type="button" aria-label="Đóng hướng dẫn cài đặt" onClick={snooze}>
              <X size={21} />
            </button>
          </div>
          <div className="mm-pwa-dialog-body">
            <span className="mm-pwa-eyebrow">
              <Smartphone size={15} /> MỘC MARIA · ỨNG DỤNG WEB
            </span>
            <h2 id={headingId}>Chạm một lần, gần Mộc hơn.</h2>
            <p id={detailId}>
              Đưa Mộc Maria ra màn hình chính để mở nhanh lịch hẹn, tìm KTV và nhắn tin. Không cần
              tải từ cửa hàng ứng dụng.
            </p>
            {socialBrowser && (
              <div className="mm-pwa-social-browser">
                <strong>Bạn đang xem qua ứng dụng mạng xã hội</strong>
                <p>
                  Chọn menu của Facebook, Zalo hoặc Instagram rồi nhấn “Mở bằng trình duyệt”. Sau đó
                  làm theo hướng dẫn bên dưới.
                </p>
                <button type="button" onClick={() => void copyAddress()}>
                  {copyState === "copied"
                    ? "Đã sao chép mocmaria.com"
                    : "Sao chép đường dẫn Mộc Maria"}
                </button>
                {copyState === "error" && (
                  <small>
                    Không sao chép được. Bạn có thể tự mở mocmaria.com trong trình duyệt.
                  </small>
                )}
              </div>
            )}
            {platform === "ios" ? (
              <div className="mm-pwa-steps" aria-label="Cách cài trên iPhone">
                <div>
                  <span className="mm-pwa-step-icon">
                    <Share2 size={20} />
                  </span>
                  <p>
                    <strong>1. Mở menu Chia sẻ</strong>
                    <small>
                      Trong Safari, nhấn biểu tượng Chia sẻ hoặc dấu ba chấm rồi chọn Chia sẻ.
                    </small>
                  </p>
                </div>
                <div>
                  <span className="mm-pwa-step-icon">
                    <Plus size={20} />
                  </span>
                  <p>
                    <strong>2. Chọn “Thêm vào Màn hình chính”</strong>
                    <small>Cuộn xuống trong danh sách thao tác nếu chưa thấy.</small>
                  </p>
                </div>
                <div>
                  <span className="mm-pwa-step-icon">
                    <CheckCircle2 size={20} />
                  </span>
                  <p>
                    <strong>3. Nhấn “Thêm”</strong>
                    <small>Nếu có “Mở dưới dạng ứng dụng web”, hãy bật tùy chọn này.</small>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mm-pwa-steps" aria-label="Cách cài đặt ứng dụng web">
                <div>
                  <span className="mm-pwa-step-icon">
                    <Download size={20} />
                  </span>
                  <p>
                    <strong>
                      {hasNativePrompt ? "Nhấn nút Cài ứng dụng" : "Mở menu trình duyệt"}
                    </strong>
                    <small>
                      {hasNativePrompt
                        ? "Trình duyệt sẽ hiển thị xác nhận cài đặt."
                        : "Trong Chrome hoặc Edge, tìm mục “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”."}
                    </small>
                  </p>
                </div>
                <div>
                  <span className="mm-pwa-step-icon">
                    <Ellipsis size={20} />
                  </span>
                  <p>
                    <strong>Xác nhận thêm Mộc Maria</strong>
                    <small>
                      Mở từ biểu tượng Mộc Maria trên màn hình chính như ứng dụng thường dùng.
                    </small>
                  </p>
                </div>
              </div>
            )}
            <div className="mm-pwa-safety-note">
              Dữ liệu đặt lịch và tin nhắn vẫn cần Internet. Cài ứng dụng không yêu cầu cấp quyền
              thông báo hay vị trí.
            </div>
          </div>
          <div className="mm-pwa-dialog-actions">
            {hasNativePrompt && platform !== "ios" ? (
              <button
                type="button"
                className="mm-pwa-primary"
                disabled={prompting}
                onClick={() => void launchNative()}
              >
                <Download size={18} /> {prompting ? "Đang mở cài đặt…" : "Cài Mộc Maria"}{" "}
                <ArrowRight size={18} />
              </button>
            ) : (
              <button type="button" className="mm-pwa-primary" onClick={snooze}>
                Đã hiểu, cảm ơn Mộc <CheckCircle2 size={18} />
              </button>
            )}
            <button type="button" className="mm-pwa-secondary" onClick={snooze}>
              Để sau
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
