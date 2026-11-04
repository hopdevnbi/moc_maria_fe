# Mộc Maria chat notifications - production audit (2026-11-04)

## Findings

- Existing Backend and PWA implement two-way customer/KTV Web Push and Socket.IO notifications without exposing private message bodies.
- Production Backend had no WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY or WEB_PUSH_SUBJECT, so the bell could not activate.
- Production Backend and Chat Socket lacked the shared MOC_MARIA_CHAT_RELAY_KEY, so the Socket.IO relay was also disabled.
- The Chat ConfigMap already has the correct MOC_MARIA_API_BASE_URL and CORS origins; Backend CHAT_SERVICE_URL points to the existing Chat service.
- The existing database migration KtvChatWebPush1793700000000 was **not** applied. It has now been applied and recorded exactly once. Verified that the push subscription table exists, RLS is enabled and privileges for anon/authenticated are revoked.

## Remaining operator-only secrets

Background Web Push remains **unavailable** until secrets are provisioned:

1. Generate a stable VAPID key pair using a trusted web-push installation.
   Never regenerate on every deployment.
2. Store VAPID public and private keys and WEB_PUSH_SUBJECT in a Kubernetes
   Secret referenced by the moc-maria-api Deployment (namespace moc-maria).
   Use an HTTPS URL for the subject, such as https://mocmaria.com.
3. Generate a 32+-character random relay key and provide the **same**
   MOC_MARIA_CHAT_RELAY_KEY to moc-maria-api (namespace moc-maria) and
   acutis-education-chat (namespace giangxa) via separate Kubernetes Secrets.
4. Restart Chat Socket first, confirm readiness, then restart Backend.
   Do not modify other Secret keys, images, replicas or unrelated services.
5. Verify an authenticated GET /api/v1/ktv-chat/push/config by a CUSTOMER
   and a THERAPIST returns publicKey not null; anonymous calls must be denied.
6. Test with two opt-in test accounts in both directions, including app in
   foreground/background, notification deep link, logout and re-login.

Never put private keys, relay keys, subscription endpoints or raw chat content
in Git, CI logs, Frontend, CDN or public documentation.

## Frontend fallback

- The compact bell now offers a helpful explanation rather than silently
  ignoring taps when background Push is unsupported/not configured.
- iOS/iPadOS Safari tabs show Home Screen PWA installation instructions.
- Browser permission prompts require an explicit user click.
- A lightweight foreground-only unread polling fallback supplements the
  Socket relay on other authenticated pages; it does not access message bodies.
- Closing the browser/locking the device still requires properly configured
  Web Push and OS notification permission. Delivery is best effort.
