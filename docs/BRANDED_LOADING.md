# Branded loading experience · 2026-10-15

Customers previously saw isolated loading text while the server read the catalog or their client fetched conversations and appointment requests. The new shared loading family uses the bundled official logo, a stationary mark with a light rotating ring, contextual copy and decorative placeholders. There is no artificial percentage, fabricated record or minimum waiting time.

## Coverage

- Streaming Suspense fallbacks: homepage, KTV directory, services, pricing, booking entry and messages.
- Route boundaries: KTV/service details and the global fallback. Public fallbacks retain the existing header/navigation.
- Client reads: chat session, threads, provider picker and history; appointment list and account inquiry list; authentication guard and membership session status.
- Authentication form submissions show a small inline spinner inside the existing disabled submit button. Chat history pagination uses the same indicator.
- Appointment and inquiry refreshes keep existing records on screen while a small update indicator is shown, including after a refresh error. Initial empty/loading/error behavior remains distinct.

The timer only changes guidance after eight seconds and is cancelled on unmount. A fast response immediately replaces the loader. Existing API paths, cancellation/timeouts, query cache, session checks, business actions and error/retry behavior are retained. No backend, database, notification or gift-event logic changes. Specialized event animations and legacy administrative data panels retain their existing loading behavior; this release targets customer-facing entry/read flows.

## Accessibility and delivery

The loading message has a polite status announcement. Skeletons, logo and decorative animations are hidden from assistive technology; they contain no links, inputs or fake business copy. Reduced-motion users receive static indicators. Layouts collapse to one card column on mobile, use existing Vietnamese fonts and do not overlay controls. The logo is a versioned same-origin WebP so the loading state does not depend on the external media CDN.

## Validation

- New behavioral tests cover eight-second guidance, cleanup on fast completion, initial loading versus empty data, retaining a request through a pending refresh and refresh failure, and recovery of the refresh button.
- Existing full frontend suite: 183 tests across 50 files passed after synchronizing dependencies with the current lockfile.
- Desktop 1440px and mobile 390px browser review: logo decoded, no horizontal overflow. Additional viewport and final build/release results are recorded in the scoped project handoff.
- Actual local streaming checks (development, live public read-only API): homepage loading at 1268ms before completion2256ms; services1383ms before1571ms; booking1147ms before2030ms. These are local observations, not a production latency guarantee.
- Two inherited quality blockers were corrected mechanically: formatting only in `wallet-qr.test.tsx`, and a file-local CommonJS-import lint declaration for the standalone `.cjs` asset generator. Neither changes gift-event behavior.

QA-only preview routes are removed before the final build and release. No production customer, booking, message, membership or configuration fixtures are written.
