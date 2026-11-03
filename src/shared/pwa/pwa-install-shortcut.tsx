"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Smartphone } from "lucide-react";
import { canUsePwaOnHost, hasInstalledPwa, PWA_OPEN_EVENT } from "./pwa-install-utils";

export function PwaInstallShortcut() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!canUsePwaOnHost(window.location.hostname)) return;
    const standalone = window.matchMedia?.("(display-mode: standalone)");
    const check = () =>
      setShow(
        !hasInstalledPwa(
          standalone?.matches ?? false,
          (navigator as Navigator & { standalone?: boolean }).standalone,
        ),
      );
    check();
    standalone?.addEventListener?.("change", check);
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      standalone?.removeEventListener?.("change", check);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      className="mm-pwa-account-install"
      onClick={() => window.dispatchEvent(new Event(PWA_OPEN_EVENT))}
    >
      <Smartphone size={20} aria-hidden="true" />
      <span>Cài Mộc Maria</span>
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}
