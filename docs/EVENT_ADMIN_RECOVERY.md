# Event admin route recovery — 2026-10-16

## Incident and cause

Production `/quan-tri/su-kien` failed before authentication or any event API query. Latest main dafb1b1 reproduced the screenshot locally: `eventTabs.includes is not a function` in the server page. The page imported an array from the `use client` event console and attempted to execute its method in the server component graph. A successful build alone did not exercise that request-time boundary. Reading searchParams outside Suspense also emitted the Next 16 instant-shell URL-data diagnostic.

## Fix

- Move the five tab IDs, tab type and strict parser to a plain shared module with no React/client directive or browser imports.
- The server page imports only the component from the client module and executes parsing from the shared module.
- Resolve request searchParams inside a Suspense child; keep the admin shell streamable with the existing branded loading fallback.
- Reuse the parser for browser Back. Missing, unknown and repeated tab parameters safely default to campaign.
- Preserve all five panels, old route redirects, counter QR scanner, quote/redemption contracts, authorization and business data.

## Regression evidence

- Before fix: actual Next development route and production browser both showed the error boundary; development server identified the exact client-array method failure.
- After fix: actual Next route reaches the existing authentication gate without the event render crash.
- Ten new regression cases cover the server entry/client-only export boundary, Suspense placement, all five deep links, invalid/repeated parameters, one-page tab changes and Back navigation.
- Full frontend quality/build and main CI/deployment evidence are recorded in the project release tracker. Existing unrelated lint warnings are retained.
- The owner then signed in for a read-only production audit. Campaign, counter and voucher panels loaded their persisted records. This exposed a separate backend defect in both report panels: PostgreSQL rejected the implicit `day` alias with error `42601`, although mock-based unit tests had passed.

## Authenticated report recovery

- Quote the daily bucket alias explicitly as `AS "day"`, including `GROUP BY` and `ORDER BY`, in both gift-report and gift-operations services. Preserve the response keys and Vietnam timezone.
- Add real PostgreSQL regression coverage for empty campaigns, issued rewards, reconciliation, Vietnam midnight, event/date filters and all-campaign aggregation, using only a disposable isolated database.
- Release evidence and the backend image digest are recorded in the backend scoped deployment record and project tracker.
- Production verification is read-only: no campaign setting changes, real voucher redemption, email, customer mutations or database migration. Camera availability is checked in the counter UI; camera access and an actual redemption are not exercised.
