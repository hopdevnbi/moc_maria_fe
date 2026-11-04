# Mobile tip QR recovery and public-page cache plan

The customer opens a KTV profile, chooses to view transfer details, and needs the supplied bank QR to load visibly and remain consistent with the account text. A phone screenshot showed a broken image. Earlier verification had covered public config/CDN and the amount-selection screen, not the payment image screen; that coverage was insufficient.

## Evidence and scope

The existing public QR PNG is valid,187960 bytes,1060x1400px. The CDN GET with mobile User-Agent/Referer returns200 and the image decodes in the available browser. This does not identify the original phone failure. The exact device-side network status was unavailable; DNS/CDN-edge/network/transient cached failure remain unproven possibilities. The PWA worker returns before intercepting cross-origin requests, caches only its generic offline page/icon, and does not cache the bank config. It also has push handlers that are preserved.

## Change

- Payment QR uses `/api/mobile/provider-tip-qr/:providerId?v=:configVersion&attempt=:attempt` on the site’s origin. The server reads the current public tip config and fetches only that provider’s stored PNG. No cookies/auth headers or browser Range request are forwarded to the CDN.
- Config and QR delivery are no-store at browser/shared/Vercel layers. The config version must match, so a new QR cannot be paired with older account text. A stale client receives409 and can refresh.
- Image delivery has bounded timeouts and one transient-network retry. Incomplete/partial responses, wrong content type, oversized payloads, missing PNG signature/IEND, or mismatched declared length are rejected instead of returned as successful images.
- The component eagerly loads the QR, shows a loading state, and replaces a failed image with an actionable retry. Retry re-reads the complete public bank configuration before requesting an image. The account card/copy actions and existing intent/self-report/receipt flow are preserved. Unsaved editor previews still use their draft URL;they are not confused with the last saved config.

## Validation

14 scoped tests cover existing tip behavior, PNG delivery,no-store,stale version rejection,transient retry,HTML/truncation rejection,removed/hidden/wrong-provider configs,bounded retries and UI error/recovery.

An uncommitted local-only page rendered the actual KtvTipPanel. A loopback-only mock returned the real public config but locally simulated the intent response;no POST was forwarded upstream. The mock changed config version between client load and image request,producing a real409 from the new image route. The UI showed retry,then refreshed settings and loaded the actual CDN PNG through the proxy. The local fixture was removed before quality/build/commit. Mock server and dev server were stopped.

The recovered payment screen has a loaded1060px image;375/390/768/1440px dialog and page bounds fit. Copy-account action reports success. Both the proxy PNG and the QR in the390px screenshot decode to the same payload as the owner’s original. Production bank config,showcase gallery and original asset are not modified by this code release. No real intent,transfer,self-report,receipt,customer or bank-data write is performed for QA.

Full quality/CI,production exact SHA and proxy content validation are recorded in the Plan release claim and exported evidence after deployment. Actual installed Android/iOS and Safari verification is not available in this session.

## Cache work delivered separately

Complete plan and9 sequential prompts00–08 were exported before wider cache changes to:
`C:/Users/User/Desktop/KTV/MocMaria_Cache_Prompts_20261104/README.md`.
The plan contains audited call paths,HTTP stream baseline,RAM/Next/browser layers,CRUD dependency matrix,generation fences,outbox retry,optional isolated Redis,PWA checks,measurement budgets,rollout and rollback. Existing queue Redis remains unchanged. No new Redis,public page RAM cache or PWA caching policy is installed by this QR fix.

Initial HTTP medians (three consecutive requests,not controlled cold/mobile):home headers316ms/full stream2611ms;KTV332/2151ms;services598/1507ms. Edge shell HIT does not prove that dynamic data is already ready. Browser performance and LCP remain a dedicated baseline task.
Local final validation:351 tests across78 files,formatting,ESLint(no errors;5 inherited warnings),TypeScript and production build PASS. Temporary QA route removed;generated dev types were moved to a private recoverable backup before the clean typecheck.
