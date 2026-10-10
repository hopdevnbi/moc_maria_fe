# Linked KTV booking preselection

A provider/service query identifies the appointment form instance so client navigation cannot retain another KTV from a previous booking route. The clicked provider takes precedence over a stored sign-in draft; a draft for a different provider is discarded rather than mixing private address, service and provider contexts. Same-provider sign-in drafts still restore.

Provider links accept the directory ID and its real chat receiver ID. A linked KTV is displayed in a compact selected card, with an explicit Change KTV action. Services remain filtered to that provider. General booking still offers the full provider picker. Backend contracts, prices and booking confirmation rules are unchanged.

Validation: full quality passed (format, lint, typecheck, 61 tests, Next build). Three added interaction cases cover both ID forms and conflicting sign-in draft. Browser client navigation Mai Anh → home → Bảo Ngọc selects Bảo Ngọc correctly, without page reload; compact selected card visible, service options filtered. Mobile 390px shows the correct selected card and no horizontal overflow.

## Production release

BOOKING PROVIDER PRESELECTION RELEASE — 2026-10-10
FE fa62d846e939c6c2ad08befedb723c9604609bb2; production deployment 6976629615.
Full quality and PR CI PASS: 61 tests, format/lint/typecheck/build. Production browser client navigation Mai Anh to home to Bao Ngoc: URL demo-ktv-04 selects Bao Ngoc only, compatible services visible. Desktop 1440 and mobile 390 correct selection, no overflow. No production appointment submitted.
Clicked provider overrides unrelated sign-in drafts. Existing API and confirmation behavior unchanged.
