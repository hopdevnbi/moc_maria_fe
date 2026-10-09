# Mộc Maria — Mobile-first booking UX implementation handoff

Date: 2026-10-09
Branch: `codex/mobile-first-booking-ui`
Base: FE origin/main `ef1e084`
Scope: frontend only, developed separately from concurrent Codex E2a booking work.

## Completed UI
- Mobile-centric discovery homepage; fast switch between picking an approved KTV and a service first.
- KTV cards: initials until a consent-cleared avatar URL is exposed, public name, role/title, declared years of experience, published service area and eligible service labels.
- KTV details with reviewed/eligible services and contextual booking links.
- Service discovery and details: actual backend variants, price, duration, branch and matching approved KTV.
- Booking wizard `/dat-lich`: KTV/service/variant/branch/day/time; checks `GET /availability` with no cache, submits `POST /bookings/requests` with server-provided total, idempotency key and acknowledgment. Booking success is a request, *not* automatically confirmed.
- Customer bookings `/lich-hen`: authenticated `GET /bookings/me`; confirms accepted quotes via `POST /bookings/:id/confirm-quote`.
- KTV registration landing `/tro-thanh-ktv`: links to existing authenticated application form `/ktv/ho-so` and admin review pipeline.
- `/hoi-vien`: ordinary customer registration and VIP informational preview. VIP NOT automatically assigned.
- Touch targets, responsive 320-390px through desktop, bottom mobile tabs with safe-area padding, accessible labels, skeleton/error/empty states.
- Public catalog `use cache` with 1-minute revalidation in Next; service details browser/CDN short TTL; private and availability reads never cache. Next image optimization on public assets.

## Backend dependencies (not part of this branch)
1. Consent-aware KTV avatar upload/CDN storage and publication gate (BE currently intentionally returns `avatarUrl: null`). Do not publish third-party photos or PII without consent.
2. Optional public age/age band with informed consent; frontend must not infer age from private birthday. Keep date of birth private.
3. Actual loyalty/customer tier model (NORMAL/VIP, eligibility criteria, auditability, admin control, promotions, possible expiry); frontend intentionally does not display phantom scores or entitlements.
4. E2a booking transaction rollout/production acceptance by active booking owner; no user-provided test booking or price fixtures in production.
5. E2b home-service schedule/geofence/fees not ready: this wizard only supports ON_SITE and matching ON_SITE service policies.
6. Provider profile/booking list data on production depends on admin-approved real business records. No fake KTV/reviews/ratings/prices.

## Coordination & release
- BE checkout and production were not modified.
- No live DB migrations, deployments or business data changes.
- Active Codex ownership of FE marketplace/booking pages must be reconciled before merging to main.
- After merging E2a, execute browser acceptance: mobile 320/375/390/430px, Android and iOS safe area, KTV-first and service-first booking, 401 login redirect, expired/change quote, concurrent slot requests, admin suspended KTV disappearing, browser back navigation, Lighthouse.
- Run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Cache policy
- Public catalogue: 1 min revalidation, only public data.
- Profile publication status and appointment slots: live, no shared cache.
- Personal account, bookings and quote: private `no-store`.
- Do not cache cookies, bearer tokens or customer data in shared Next cache.
