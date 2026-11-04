# KTV booking/chat notification links

Owner-authorized Zalo KTV routing release, 2026-11-04. Backend sends each KTV only their own bookings and incoming customer chats, keeps existing three administrator channels and masks phone/email. No public or private booking data is stored in a shared browser cache.

Booking links carry the persisted 64-hex inquiry ID: /tin-nhan?inquiry=<id>. InquiryChatEntry preserves this locator through login. Its authenticated POST to /ktv-chat/inquiries/:id/thread returns a thread only for the KTV assigned to that booking; unrelated KTV, customer and admin accounts receive a non-disclosing 404. Failed requests show retry and the appointment link. Opening a thread does not send a message.

Incoming chat links use /tin-nhan?thread=<UUID>. The existing chat UI verifies membership through its authenticated thread list, selects the referenced thread and preserves the locator through login. Password, block, drafts and existing message handling remain unchanged. Backend must be deployed before frontend.

Four new focused tests cover guest preservation/no anonymous write, exact authenticated endpoint, safe failure retry and loading auth. The existing 35 chat tests also pass. Full FE suite367 tests/81files and production build passed. Final source, CI/deploy IDs and two bot recipient readiness are recorded with the BE release report deploy/ktv-zalo-release.json. There are no bot credentials in this frontend.
