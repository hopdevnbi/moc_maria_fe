# KTV booking/chat notification links

Owner-authorized Zalo KTV routing release, 2026-11-04. Backend sends each KTV only their own bookings and incoming customer chats, keeps existing three administrator channels and masks phone/email. No public or private booking data is stored in a shared browser cache.

Booking links carry the persisted 64-hex inquiry ID: /tin-nhan?inquiry=<id>. InquiryChatEntry preserves this locator through login. Its authenticated POST to /ktv-chat/inquiries/:id/thread returns a thread only for the KTV assigned to that booking; unrelated KTV, customer and admin accounts receive a non-disclosing 404. Failed requests show retry and the appointment link. Opening a thread does not send a message.

Incoming chat links use /tin-nhan?thread=<UUID>. The existing chat UI verifies membership through its authenticated thread list, selects the referenced thread and preserves the locator through login. Password, block, drafts and existing message handling remain unchanged. Backend must be deployed before frontend.

Four new focused tests cover guest preservation/no anonymous write, exact authenticated endpoint, safe failure retry and loading auth. The existing 35 chat tests also pass. Full FE suite367 tests/81files and production build passed. Final source, CI/deploy IDs and two bot recipient readiness are recorded with the BE release report deploy/ktv-zalo-release.json. There are no bot credentials in this frontend.

## Production verification 2026-11-04

Source91508972c8a86558c9ccb01daf4a9ee0fbe8e9a5 deployed from main to Vercel dpl_9toVYfmRUfq9HtmozVaDsLEVyuGg, READY. Both primary/event domain release endpoints matched. Actual production browser: booking link shows the KTV login prompt; clicking login keeps the complete64-hex inquiry locator in returnTo. No login, customer message or booking fixture was created. Backend requires the assigned KTV, with three admin channels verified retained.

Initial GitHub run41806805036 passed format/lint/typecheck and all367tests but its uncached build failed in the existing next/font Google loader (font URL extension parsing); the Vercel production build and local build succeeded. The active GitHub CLI account and connected app cannot re-run Actions (403). This evidence commit records the released behavior and schedules fresh validation through the authorized main push; final check status belongs in the backend release report.

Both bot webhooks passed Zalo webhook.ok. At this verification checkpoint neither intended KTV had sent the private pairing phrase, so recipient IDs remain unset and no staff notifications are being sent to an unverified recipient. Existing admin delivery remains active. This is an external enrollment prerequisite, not a request to grant either KTV admin privileges.
