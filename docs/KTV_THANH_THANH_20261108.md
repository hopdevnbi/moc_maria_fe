# KTV Thanh Thanh — onboarding scope (2026-11-08)

## User-provided facts

- Public name: Thanh Thanh; birth year: 1999 (exact age unknown).
- Strengths: strong hands, deep muscle release skills, enthusiastic, gentle and kind.
- Owner-provided activity photo: `Desktop/KTV Thanh Thanh/thanh thanh.jpg` (SHA-256 `c6ca9bf5c96456c31655422c5dca242070a83b2b27872dd4f78da0d846a753d2`).

## Code and image

- New, stable local presentation ID: `ktv-thanh-thanh`; named path `/chuyen-vien/thanh-thanh`.
- Public photo `/media/ktv/thanh-thanh-20261108.webp`, resized from the original and cropped to focus on the KTV, avoiding showing the customer's face. Original is unchanged.
- Owner-provided content is added alongside the existing seven KTVs; no existing account, public alias, historical URLs or chat threads are repurposed.
- Until the provider has a **distinct backend account and application**, this is an introduction-only profile. The home card and detail have no functional chat/booking links, tip/paid service offers or false ratings/verification claims.
- The site currently loads seven real chat receivers from `/ktv-chat/providers`. New introductions are handled separately. If a new backend receiver is later linked with `publicAlias: ktv-thanh-thanh`, the normal account/display policy takes precedence; a hidden profile must not reappear through the preview fallback.

## Remaining operational onboarding

To activate staff sign-in, private chat and editable provider information, use the established backend registration/onboarding process with Thanh Thanh's **own** contact/login details and unique `provider_applications` identity. Never map to legacy `demo-ktv-08` or another staff account. Set the account and profile to active only after authorization, and configure `app_metadata` chat/display mappings according to existing production protocol. Keep booking/service eligibility disabled until its normal checks and approvals are complete; no invented qualifications, schedule, reviews, bank/QR or Zalo bot.

This task changes the frontend presentation only. Production DB and website deployments are separate operations; do not claim they occurred from a successful local build.

## Local validation

- Frontend `npm.cmd run typecheck`, scoped ESLint and production `npm.cmd run build`: PASS.
- Vitest: four files, 10 tests passed, including safe fallback, owner data, legacy roster and profile routing.
- HTTP smoke on the isolated local build: `/chuyen-vien/thanh-thanh` returned 200 with correct name, 1999, photo and disabled scheduling/chat; new WebP asset returned 200 (42,724 bytes); homepage returned 200 and contained Thanh Thanh.
- GitHub main and production database not changed by this feature branch.
