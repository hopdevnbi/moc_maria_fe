"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { EventSupport } from "@/features/gift-events/event-support";
import "./global-contact-actions.css";

/**
 * One pair of floating contact actions for every route and both Mộc Maria domains.
 * Render under AuthProvider in the shared root to preserve login and KTV chat state.
 */
export function GlobalContactActions() {
  const { status, user, authFetch } = useAuth();

  return (
    <div className="mm-global-contact" aria-label="Liên hệ Mộc Maria">
      <EventSupport status={status} user={user} authFetch={authFetch} />
      <a
        className="mm-global-contact-facebook"
        href="https://www.facebook.com/mocmariads"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fanpage Facebook Mộc Maria (mở trong tab mới)"
        title="Kết nối với Mộc Maria trên Facebook"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14 22v-9h3l.5-4H14V7c0-1.2.3-2 2-2h2V1.4C17.4 1.2 16.2 1 15 1c-3 0-5 1.8-5 5v3H7v4h3v9h4Z" />
        </svg>
        <span>Facebook</span>
      </a>
    </div>
  );
}
