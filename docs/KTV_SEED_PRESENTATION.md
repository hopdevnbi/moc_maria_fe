# KTV seed presentation audit — 2026-10-09

The public directory renders ten stable seed profiles from `src/features/mobile/demo-ktvs.json`, appended to eligible real providers by `publicProviderDirectory`. Detail pages resolve the same JSON. `scripts/seed-demo-ktv-metadata.cjs` stores a copy under `app_metadata/mocmaria.demo.ktv.v1`; this metadata is not the live directory source. Re-running a database seed is unnecessary for this display change.

CODE: Remove sample/demo/illustration labels, banner and repeated explanatory wording from the directory, profile, service catalog and linked KTV tiles. Use ordinary role/service headings, meaningful service-specific introductions and plain availability text. Update `generate-demo-ktvs.mjs` so regeneration produces the same copy. Names, IDs, avatars and price/age/experience values are preserved. No invented approval badge or customer ratings added. Internal source flags, booking/chat eligibility and real review checks remain intact. No database writes, account creation, certification or migration.

TEST: Existing21 frontend tests, typecheck and build PASS. Full lint PASS after removing an unused icon. Seed IDs remain unique and ten profiles remain isolated/nonbookable; generator syntax check PASS. Browser local mobile390 and desktop directory, seeded profile and text checks; release verification pending.

COMMIT/DEPLOY: pending frontend PR/CI and Vercel release. BUSINESS_DATA: display metadata only, no production operational rows. This request explicitly authorizes removing public seed labels; prior generic presentation-label guidance is superseded for this request. Existing booking and service-photo/realtime work is preserved in separate checkouts.
