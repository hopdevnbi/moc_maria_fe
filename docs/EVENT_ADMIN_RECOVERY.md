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
- No backend deploy, migration, campaign setting change, voucher redemption, email or customer mutation is part of this repair. Live authenticated content requires an owner login; anonymous production checks validate the repaired server entry and existing auth gate.
