# Booking lifecycle and note defaults

The admin booking board shows confirmed, in-service and completed states alongside intake/cancellation states. Super Admin can use "Đổi trạng thái lịch hẹn" for any permitted correction; completion has a separate unchecked confirmation. The dialog keeps a snapshot of the selected inquiry ID, expected state, timestamp and linked appointment version so a background list refresh cannot switch its target.

The backend's normalized linked appointment status is authoritative. Legacy KTV completion stamps are recognized for old responses. The completed filter/count and audit history include KTV completions.

Booking forms, admin intake, admin status/archive/restore dialogs and KTV completion provide editable notes. The default completion note is "Đã hoàn tất buổi chăm sóc theo lịch hẹn." Official KTV start sends a start-specific reason, never the completion note. Existing saved custom/empty booking drafts remain intact.

Backend must deploy first: the new status options and legacy KTV start require the additive API update documented in backend docs/BOOKING_LIFECYCLE.md. Operational completion of an unlinked inquiry does not create a verified booking/payment or change review eligibility.

Validation: full frontend quality (format, lint, TypeScript, 186 tests in 50 files and production build) PASS before integration. Recheck the independently updated event landing module after merging latest main. Backend isolated PostgreSQL suite: 17/17 affected integration tests PASS. No production booking status is mutated for QA.
