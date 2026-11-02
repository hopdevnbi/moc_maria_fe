# Immediate chat sending

Date: 2026-11-02. Scope: shared customer/KTV chat UI, based on origin/main bf5404b.

## Problem and behavior

Text messages already had an optimistic outbox. Image messages waited for the image upload before creating the outgoing bubble. The composer also displayed a spinner and blocked all further sends until the current upload/save finished.

Both text and images now enter the outbox immediately. Images use their local object URL while upload and message persistence run in the background. The composer clears and retains focus; subsequent drafts and image selections remain usable. React Query mutation scope serializes persistence to preserve send order while queued bubbles are already visible.

Every submission owns a UUID, attachment and delivery state. Failed bubbles retain their retry action and original UUID. A successful upload URL is reused when only message persistence failed. Equal message bodies can be submitted separately while another send is pending. Object URLs remain alive for pending/failed attachments and are released after confirmation, removal, concealment or unmount.

Locking a private thread discards its queued inputs and outbox. An upload completing afterward cannot initiate a message save. Existing server permission, privacy and idempotency checks remain authoritative.

## Validation

Component regressions hold upload and save promises unresolved for customer and KTV accounts and assert the image/text bubbles appear before either response, subsequent sends remain available, delivery order is preserved, and a new draft survives completion. Further regressions cover upload failure, save failure without reuploading, stable retry UUIDs, preview cleanup and privacy locking during upload. Existing thread switching, blocking, privacy, incremental polling and reconciliation checks are retained.

Full suite: 229 tests across 59 files passed. The final privacy subscription adjustment was additionally checked with all 25 chat interaction tests. Scoped Prettier/ESLint checks and production build passed; repository lint has three pre-existing warnings outside these files.

Owner authorized main integration, push and production deployment on 2026-11-02. Release evidence is recorded separately in the workspace Plan claim. Release preparation also formats 11 existing files to satisfy the repository-wide Prettier CI gate; these edits have no intended runtime changes. Backend/schema and production conversation data are unchanged.
