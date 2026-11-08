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

## Owner follow-up — care menu parity with Nguyen Hoan (2026-11-08)

- Reuse the five existing service IDs of historical KTV-06 (Nguyen Hoan) from `demo-ktvs.json`: deep-muscle relief `demo-pressure`, foot massage `demo-neck`, neck/back `demo-hot-stone`, sleep care `demo-thai`, and head care `demo-back`.
- The menu, price labels and ordering are resolved through `officialLegacyCareItem` / `careMenu`, so both KTV cards display the same five published price points.
- Presentation and pricing are not account verification or service eligibility. Until her distinct KTV account exists, Thanh Thanh's homepage chat/booking actions remain disabled, and detail service rows display a non-clickable pending state. No fake bookings, approvals, testimonials or scheduled shifts.
- Verification: 25 scoped Vitest assertions PASS; TypeScript typecheck, ESLint and Next.js production build PASS. Local production HTTP checks of home, Thanh Thanh and Nguyen Hoan profiles returned 200 and included all five identical official menu names. The Thanh Thanh detail continues to display the non-clickable pending state.

## Image/video and Admin creation workflow

- Owner's `1.jpg` was optimized as `/media/ktv/thanh-thanh-gallery-20261108.webp`, and `2.mp4` is served as `/media/ktv/thanh-thanh-intro-20261108.mp4`. Both use the same KTV gallery as existing profiles and were released in commit `2c421a4`.
- New Super Admin dialog on `/quan-tri/ktv` uses the Backend onboarding API to create a unique KTV account, display generated one-time credentials, choose official care services and upload the new profile's media to Bunny CDN. The Admin KTV detail also embeds the media manager.
- The **Tạo mới KTV** control is deliberately disabled until `GET /admin/provider-display/ktv/capabilities` confirms a compatible deployed Backend. A Vercel deployment alone cannot activate the Backend feature.
- To preserve Thanh Thanh's public URL, the new Backend onboarding path assigns her reserved alias `ktv-thanh-thanh` when her own account is created. Static introduction media is used while no saved CDN-backed showcase exists; after the first save, the existing editor owns the gallery.
- Do not publish images/video without rights and consent for everyone appearing in them. Actual booking qualifications and staff approval are separate operational steps.

## Local validation

- Frontend `npm.cmd run typecheck`, scoped ESLint and production `npm.cmd run build`: PASS.
- Vitest: four files, 10 tests passed, including safe fallback, owner data, legacy roster and profile routing.
- HTTP smoke on the isolated local build: `/chuyen-vien/thanh-thanh` returned 200 with correct name, 1999, photo and disabled scheduling/chat; new WebP asset returned 200 (42,724 bytes); homepage returned 200 and contained Thanh Thanh.
- GitHub main and production database not changed by this feature branch.
