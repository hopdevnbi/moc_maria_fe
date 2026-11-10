# iPhone / Safari startup recovery — 2026-11-10

## Report and diagnosis boundary

Owner reports Thanh Thanh's iPhone XS Max stays at “Mộc đang kiểm tra phiên đăng nhập của bạn” in browser and installed PWA, on both Wi-Fi and 4G. The owner subsequently supplied Settings → About confirming iOS 16.1.2 on the iPhone XS Max, below the supported Safari 16.4 baseline. The photo also shows a battery parts warning; that does not establish a cause of a specific website bootstrap failure. The photographs show the server-rendered auth loading state; they do not prove a hardware failure, a particular network error, or an expired account.

Production baseline `abd623b6b53816da129d43c8e8207f532477c240` was verified through `/api/release`. That release already bounds auth fetch and response parsing to 12 seconds. The standard loading copy also changes after eight seconds **if React has started**. If neither changes, a failure to load/parse/hydrate application JavaScript is a candidate; timing on the affected phone still needs confirmation. An existing authenticated KTV browser session opened the account dashboard successfully during this investigation; no account, GPS, booking or chat mutations were performed.

Next.js 16 supports Safari 16.4+ ([official browser support](https://nextjs.org/docs/architecture/supported-browsers)). The iPhone XS Max can run iOS 18 ([Apple](https://support.apple.com/en-gb/104985)); its age alone does not establish incompatibility. WebKit can suspend background iOS pages ([WebKit lifecycle guidance](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/)). The confirmed OS version establishes a compatibility gap. It does not identify the exact failing browser instruction; no physical-device console trace is available.

## Code

- An ES5 inline check in the initial HTML identifies iOS below 16.4 before React starts and immediately reveals OS-update instructions. It does not prevent public navigation or change auth state. On other browsers, server-render a recovery panel with a CSS-only 20-second reveal, independent of React, API calls and browser storage. AuthProvider suppresses it only once session bootstrap has settled. No automatic reload loop.
- Keep a normal HTML recovery link available directly in the protected-page loading/error states. It does not require Next.js client navigation.
- `/pwa/recover.html` is a standalone, no-store HTML page with inline basic CSS and a small ES5-compatible script. It reports only iOS version, browser/standalone mode and the browser's online indicator locally. It makes no telemetry or authentication requests. The online indicator does not establish API reachability.
- A user-triggered refresh updates only the root `/sw.js` worker and deletes only caches prefixed `moc-maria-pwa-offline-`. It preserves cookies, local/session storage, installed icon, push subscriptions and server data. It does not call `unregister` or `unsubscribe`; existing notification enrollment is retained. Blocked/hung cleanup falls through within three seconds. The normal PWA initialization also checks registration after reopening.
- The service worker passes the recovery HTML and script through to the browser network stack.
- Reopening uses a fresh document query and an allowlist of relative destinations; arbitrary return URLs and API paths are rejected.
- Authentication deadlines additionally compare wall time on `pageshow`/`visibilitychange`, so resuming a frozen Safari/PWA does not leave a stale bootstrap fetch waiting for a delayed timer.

## Validation

Automated regressions cover successful/anonymous auth, failed/hung auth, retry, stale refresh after login, suspended timers, native links, old/supported iOS descriptions, unsafe return targets, scoped worker/cache cleanup, denied storage and cleanup timeout. Recovery script also parsed with Acorn's ES5 grammar. Full quality/build and browser verification results are recorded in the workspace handoff after completion.

## Commit / deployment

Integrate the isolated `codex/safari-startup-recovery` worktree into `main` after validation and ancestry checks. Exact source, CI and production release results belong in the workspace scoped handoff. This report does not claim reproduction or resolution on the physical iPhone before Thanh Thanh retests.

## Business data

Frontend-only recovery and lifecycle handling. No backend, VPS, schema, credentials, role grants, production accounts, attendance, bookings or chat records changed. Other worktrees and private configuration are preserved.

## Affected-device check

For the confirmed iOS 16.1.2 device, update iOS first through Settings → General → Software Update to the latest version offered for this device; then reopen Safari and the installed app. The website cannot update the OS remotely. Open `https://mocmaria.com/pwa/recover.html` directly in Safari if a stale page remains. On unsupported iOS, the recovery page places OS-update instructions above reload/cache actions. On supported iOS, try “Tải lại trang”; if still stuck, use “Làm mới ứng dụng trên máy này”, then reopen the installed app. If the supported OS still fails, obtain the recovery-page screenshot and determine whether the normal auth retry screen appears after 12 seconds or the independent recovery panel after 20 seconds; that separates a network/session bootstrap failure from a JavaScript startup failure. The physical-device result is still required to establish the exact cause.
