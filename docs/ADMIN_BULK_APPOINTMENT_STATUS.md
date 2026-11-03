# Admin appointment bulk status updates

Date: 2026-11-03. Frontend-only enhancement on `/quan-tri/lich-hen`.

## Using the board

- Tick independent checkboxes beside appointments, or select all eligible records on the current page. Clicking a row still opens its detail without changing the bulk selection.
- Choose a shared allowed target status and select **Cập nhật N lịch**. The confirmation lists each frozen customer/service/KTV/time and the target state, and supplies the existing editable status note. Times also distinguish multiple bookings by the same customer in failure results.
- Marking completed still requires explicit confirmation that all affected care sessions actually occurred. This does not record payment, create a verified booking or alter review eligibility.
- Selection resets on status/search/archive filters and pagination. Readonly and archived rows cannot be selected. A mixed group can target a state only when every record allows it or is already in that state; already-correct records are skipped.

## Persistence and failure handling

The feature uses the existing authenticated per-record PATCH endpoint, with the same expected status, update timestamp, linked appointment version, completion attestation and reason fields as a single-record update. Server role checks, concurrency protection and per-record audit history remain authoritative. No new API route, schema or backend behavior is needed.

At most two records are written concurrently. Progress reports finished/total counts; duplicate submissions and closing the confirmation during processing are blocked. Responses are never retried automatically. Each result is classified as updated, already correct or unconfirmed; one failure does not hide the other results or resend successes.

The private query cache for the current user is refreshed once after the batch. Only unconfirmed records still visible in the refreshed view remain selected. A refresh failure is reported separately. Users can inspect current values before starting another explicit attempt, including after a lost response that may already have been committed.

## Scope and validation

The board integration changes only the root wrapper, toolbar and row checkbox adapter. Existing detail, single-record status/archive/restore actions and other owners' fulfillment/booking modules are retained. Concurrent canonical frontend/backend edits are preserved; no backend source or production appointment status is changed for QA.

Regression tests cover selection scope/indeterminate state, readonly/archived rows, mixed-status permissions, skip/deduplication, frozen per-record versions, completion attestation, bounded concurrency, progress, partial failures, duplicate submission protection, cancellation, query refresh and focus restoration. Existing single-record admin tests remain intact.

Browser verification uses the actual AdminShell and appointment board with a temporary local-only authenticated transport and explicit disposable in-memory fixtures. Desktop selection, mobile 320x568/390x844 confirmation, full success, three successes plus one version conflict, refreshed counts and retained failed selection are checked without touching real bookings. The temporary route is removed before production quality/build/commit. Final SHA, CI/deployment and live read-only evidence are recorded in the Plan trackers.
