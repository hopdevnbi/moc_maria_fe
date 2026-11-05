"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, Headset, MapPinCheck, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { EventSupport } from "@/features/gift-events/event-support";
import "./global-contact-actions.css";

export function GlobalContactActions() {
  return (
    <Suspense fallback={null}>
      <ContactActions />
    </Suspense>
  );
}

function ContactActions() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Navigation/account changes dismiss the panel and the previous account's support data.
  return <ContactMenu key={`${pathname}:${user?.id ?? "guest"}`} />;
}

function ContactMenu() {
  const { status, user, authFetch } = useAuth();
  const [panel, setPanel] = useState<"actions" | "support" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const firstAction = useRef<HTMLButtonElement>(null);
  const changeSupport = useCallback((open: boolean) => setPanel(open ? "support" : null), []);

  useEffect(() => {
    if (panel !== "actions") return;
    firstAction.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPanel(null);
      launcher.current?.focus();
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [panel]);

  return (
    <div ref={root} className="mm-global-contact" aria-label="Tiện ích Mộc Maria">
      {panel === "actions" && (
        <nav id="mm-contact-actions" className="mm-contact-menu" aria-label="Tiện ích nhanh">
          <div className="mm-contact-menu-heading">
            <span>MỘC MARIA</span>
            <strong>Mộc luôn ở đây</strong>
          </div>
          <div className="mm-contact-menu-grid">
            <button
              ref={firstAction}
              type="button"
              className="mm-contact-item is-support"
              onClick={() => setPanel("support")}
            >
              <span className="mm-contact-icon">
                <Headset size={24} aria-hidden="true" />
              </span>
              <span>Support</span>
            </button>
            <a
              className="mm-contact-item is-facebook"
              href="https://www.facebook.com/mocmariads"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Mộc Maria (mở tab mới)"
              onClick={() => setPanel(null)}
            >
              <span className="mm-contact-icon">
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M14 22v-9h3l.5-4H14V7c0-1.2.3-2 2-2h2V1.4C17.4 1.2 16.2 1 15 1c-3 0-5 1.8-5 5v3H7v4h3v9h4Z" />
                </svg>
              </span>
              <span>Facebook</span>
            </a>
            <Link
              className="mm-contact-item is-checkin"
              href="/check-in"
              onClick={() => setPanel(null)}
            >
              <span className="mm-contact-icon">
                <MapPinCheck size={24} aria-hidden="true" />
              </span>
              <span>Check-in</span>
            </Link>
          </div>
        </nav>
      )}
      <EventSupport
        status={status}
        user={user}
        authFetch={authFetch}
        open={panel === "support"}
        onOpenChange={changeSupport}
        hideLauncher
        returnFocusRef={launcher}
      />
      <button
        ref={launcher}
        type="button"
        className="mm-contact-launcher"
        aria-label={panel ? "Đóng tiện ích nhanh" : "Mở tiện ích nhanh"}
        aria-expanded={panel !== null}
        aria-controls={
          panel === "actions"
            ? "mm-contact-actions"
            : panel === "support"
              ? "mm-event-support-content"
              : undefined
        }
        title="Support · Facebook · Check-in"
        onClick={() => setPanel((value) => (value ? null : "actions"))}
      >
        {panel ? (
          <X size={25} aria-hidden="true" />
        ) : (
          <CircleDot size={32} strokeWidth={1.5} aria-hidden="true" />
        )}
        <span className="sr-only">Support, Facebook và Check-in</span>
      </button>
    </div>
  );
}
