# Facebook shortcut and booking reassurance

Public KTV, service, account and booking pages include a floating link to https://www.facebook.com/mocmariads, opening in a separate tab with noopener/noreferrer. Mobile uses a 48px circular button above the tab bar and respects safe-area insets; desktop includes a Facebook label. Chat keeps its composer clear.

Both appointment inquiries and the existing verified booking form share the same gently worded note about healthy professional services, mutual respect, consent, service boundaries and the right of customers/KTVs to stop an unsuitable session. This is informational content, not a new legal acceptance step or booking-rule change.

Validation: full quality (format, lint, typecheck, 58 tests, production build) PASS. Local browser widths 320/390/768/1440 show no horizontal overflow; 390px button 48x48 and ends 25px above tab bar. Correct fanpage href and note visible on mobile and desktop; UI only.

## Production release

SOCIAL / BOOKING REASSURANCE RELEASE — 2026-10-10
FE bb4ae2bcf0230e76884944abde32e67f11475ee2; production deployment 6976411739.
Full quality and main CI PASS: 58 tests, format/lint/typecheck/build. Production mobile 320/390/768 and desktop 1440 no overflow; fanpage href correct, 48px mobile action above tab bar; both note and 10 KTV receivers visible.
UI content only; previous accounts, moderation, inquiries and verified booking behavior preserved.
