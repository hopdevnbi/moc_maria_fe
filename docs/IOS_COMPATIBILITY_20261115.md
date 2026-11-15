# Older iOS account and booking compatibility

The reported iOS 16.1 screenshot shows server-rendered account loading indefinitely, with an earlier message requiring iOS 16.4. This is consistent with a client bootstrap failure, but the screenshot alone does not identify its exact exception. No real iOS 16.1 device or Safari remote debugging session was available. Production browser inspection is blocked by the saved browser permission policy.

Next 16 defaults to Safari 16.4+. This project now explicitly targets Safari/iOS 15.4+ through Browserslist, while the standalone recovery path uses ES5 JavaScript, ordinary CSS and XMLHttpRequest. These compilation targets are not a claim that every advanced feature works on every older OS. Existing notification capability checks remain in place; unsupported Web Push does not prevent authentication or booking.

## Behavior

- The full application still gets the first opportunity to start. On iOS below 16.4, if auth has not settled after 18 seconds, the initial HTML script opens `/compat/index.html` with an appropriate section. It never clears cookies or storage, and never redirects while the user is typing in a form. Successfully started applications do not switch.
- A visible compatibility link also exists in the server-rendered startup help and independent recovery page. Updating iOS is no longer a prerequisite for account and booking actions.
- `/compat/index.html` and its ES5 script/styles run independently of Next/React hydration, service worker registration, Web Push and browser storage. The existing API handles login, registration, refresh, logout, submitting appointment inquiries and reading the user's own sent inquiries. Sending an inquiry is explicitly distinguished from a confirmed appointment.
- Session refresh and public catalog loading run independently. Requests have a 15-second deadline. Late bootstrap responses cannot replace a later login; access tokens stay only in memory, and refresh cookies retain the existing API policy.
- New booking requests use cryptographically random UUIDs and the existing backend idempotency contract. A retry of an uncertain request keeps the same key. Changing users or booking details creates a different identity. Backend permissions and validation remain authoritative.
- `/api/compat/catalog` reuses the normal public directory, service eligibility and official labels, returning only visible linked receiver UUIDs and service choices. It returns no user data. No private API proxy or alternate permission system is added.
- A small pre-hydration compatibility script supplies missing `AbortSignal.timeout/any` methods used by optional catalog/review widgets. Existing native implementations are retained.
- Compatibility assets and catalog use `no-store`. The service worker explicitly bypasses compatibility/recovery resources. Existing service worker behavior remains network-only for navigation and never caches API/private data.

## Validation and limitations

Regression tests exercise ES5 parsing, independent auth/catalog bootstrap, login/registration, session timeout and races, idempotent booking retry, refreshing expired access, private-list cleanup, old-iOS fallback timing and public catalog identity mapping. Existing auth/booking/push tests remain applicable. Tests use mocked API responses; they never create production accounts, bookings or notifications.

The deployment record and actual check results are recorded in the local task ledger. Device testing on the affected iOS 16.1 phone remains necessary to confirm its full-interface engine behavior. The compatibility URL is independent of that engine-specific failure.

Local release checks: format PASS; ESLint 0 errors (5 existing warnings); TypeScript PASS; 522 tests / 105 files PASS; production build PASS; production dependency audit 0 vulnerabilities. Local browser at 390px and 320px: forms and persisted provider/service options visible, no horizontal overflow. Compatibility HTML/JS/CSS/catalog HTTP200 with no-store; catalog returns 8 linked UUID receivers. Production API CORS preflight allows mocmaria.com with credentials. No production account, inquiry or notification created.
