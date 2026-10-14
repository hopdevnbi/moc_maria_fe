# Homepage KTV management

`/quan-tri/ktv` now has a dedicated public-display console above the unchanged
training/application management section. Administrators can move visible KTVs
using drag and drop, up/down buttons, or a numbered position selector. The order
is a draft until **Lưu thứ tự** is pressed; undo is available. Mobile controls
have 44px touch targets.

The console edits persisted public names, age, years of experience, title, area
and introduction. Hidden and archived records have separate filters. Archive is
recoverable; restoration defaults to hidden so a second explicit action publishes
the KTV again. It does not delete identity, appointments, conversations, training
or qualification evidence. Full application management remains under the
expandable **Hồ sơ, đào tạo & điều kiện nhận lịch** section.

The backend uses the existing `app_metadata` table and an audited versioned
configuration. Updates require an exact expected version. Concurrent updates
return 409 instead of overwriting another administrator's work. Reordering sends
all real provider IDs, including hidden/archived rows; stale membership is rejected.

Public rendering resolves existing aliases to actual chat/application IDs, applies
the visibility policy, overrides only display fields and preserves all service
and booking constraints. The directory and public revision reads are `no-store`.
Public revision includes the display configuration so the existing refresh hook
detects edits. A failed policy read does not resurrect hidden records.

Verification uses isolated PostgreSQL and UI tests; no production profile is
hidden, archived, edited or reordered as a fixture.
