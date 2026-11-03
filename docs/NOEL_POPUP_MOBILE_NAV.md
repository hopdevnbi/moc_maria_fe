# Noel homepage promotion and event mobile navigation

## Behavior

- The homepage `/` streams an optional promotion after the public KTV directory. A separate Suspense boundary and a five-second public API timeout keep campaign failure from blocking the directory. Next 16.4 `io()` runs outside API failure handling so prerender suspension cannot be swallowed and the live campaign is never baked into the static shell.
- The popup appears after 1.2 seconds, once per browser-tab session, for the live 2026 Christmas campaign only. It checks expiration again before opening. Failed, paused, unrelated and expired campaigns do not show a promotion.
- The popup introduces vouchers up to 50% and the owner's requested separate Noel gift up to VND 5 million. Its condition text distinguishes the two offers. This changes marketing presentation only; prize allocation, eligibility, wallet data and booking rules remain unchanged.
- The gift image, offer cards and primary CTA link to `https://event.mocmaria.com/#vuon-qua` in the same tab.
- Native modal semantics, focus restoration, Escape/backdrop dismissal, scroll locking, a 44px close button and a 48px primary CTA support keyboard and touch use. An existing modal or active text entry prevents an interruption. Blocked session storage has an in-document frequency fallback.

## Mobile layout

- The event page reuses the extracted five-button navigation: KTV, Dịch vụ, Đặt lịch, Chat and Tài khoản. Event links are absolute destinations on `https://mocmaria.com`; existing app links remain relative. No event tab is incorrectly highlighted as the homepage.
- The existing 700px navigation breakpoint is retained. Safe-area padding, 46px minimum tap targets and reserved event footer space prevent overlap with device controls or page content.
- The post-gift booking CTA sits above the navigation. While that picker is present, mobile floating contact buttons are hidden so they cannot obscure its selection and booking controls; Chat remains directly available in the navigation.
- Elsewhere, mobile support and Facebook controls use compact 46px icons. The support panel opens above them and stays inside a 320px viewport.
- Popup layout adapts at 600px and short viewport heights; content scrolls independently and the main CTA remains reachable.

## Verification

- Added automated coverage for live-campaign filtering/fail-closed reads, popup timing/session frequency/expiration/focus/Escape/competing interactions and all five main-site navigation destinations.
- Local browser checks: homepage popup at 320x568, 390x844, 390x420 and desktop 1440x900; no horizontal overflow and the CTA/close control remain reachable. Dismiss-and-reload retains the frequency guard.
- Event navigation checked at 320x568 and 390x844. The support panel is within viewport bounds at 320px. The post-gift KTV picker was verified using a temporary local-only layout route with real public provider records; no gift or booking was issued. That temporary route is removed before release.
- Existing event metadata and analytics are preserved. No backend, account, campaign, voucher, KTV or booking data writes are included.

Release SHA, CI/deployment IDs and production browser evidence are recorded in the coordinated Plan trackers after deployment.
