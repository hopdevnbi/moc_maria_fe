# Mộc Maria lucky wheel — P19-T01

Routes: `/tro-choi` (public practice) and `/tro-choi/tai-khoan` (existing account wallet).
The public quick-action launcher links to practice; account shortcuts link to account play immediately above Install App.

Practice is entirely local, with its own `mm-guest-wheel-v1` sessionStorage namespace, initially zero coins, freely settable from 0 to 1,000,000. Same-tab reload preserves it. A new Vietnam calendar day resets before any pending settlement. End explicitly resets it; browsers may restore a closed tab's session, so tab close is not an absolute deletion guarantee. Storage failures fall back to memory. No practice request reaches the coin API and no practice coins transfer into an account. Device-held encryption is explicitly described as local consistency, not server fairness.

Account mode reuses Mộc's `authFetch`, session refresh and active-user checks. All existing active account types may use their own check-in wallet. Must-change-password accounts must update their password first. No starting real coins are minted. `total_earned` retains its attendance meaning; game history is separate.

Both modes use 15 numbered sectors: 0 green, odd red, even black. 20-second rounds, one 1–100 coin entry per account/round, gross payouts ×2 red/black and ×14 green including the stake. Account results are pre-generated and encrypted on the server, then verified against the published SHA-256 commitment. The client uses idempotent request IDs and reserves uncertain debits until reconciled.

Design uses Mộc green/gold, compact Vietnamese text, responsive single-column layout, visible focus, reduced-motion support and rounded SVG coordinates for hydration. No new raster image or CDN asset is required. Existing iOS compatibility/runtime, homepage promotion and booking routes are preserved. Abort/UUID helpers avoid reliance on newer Safari APIs.

Validation before release: 533 frontend tests passed, typecheck/lint/format and production build passed; focused guest lifecycle/proof tests cover replay, midnight expiry before settlement, same-tab reload, storage denied and corrupt state. Production dependency audit: zero vulnerabilities after Next/eslint-config-next 16.4.6 patch. Vitest 3.2.6 still has pre-existing development-only advisories requiring a separate major/toolchain upgrade; it is not exposed as a server.

Browser visual QA could not run in this Windows session: browser launch returned OS policy code 1260; the available in-app browser also timed out attaching. Responsive CSS and rendered component behavior require a real-device acceptance pass; do not report screenshots or successful browser verification without evidence. See the workspace P19 report for exact release state.
