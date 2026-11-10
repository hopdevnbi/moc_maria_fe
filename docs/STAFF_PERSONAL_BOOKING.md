# Staff personal service requests

The owner permits KTV and administrators to request services for themselves with another KTV. The booking button previously required `customer.portal`; the API imposed the same restriction.

The scoped capability now supports active staff roles (THERAPIST, DOCTOR_CONSULTANT, SUPER_ADMIN, ADMIN, BRANCH_MANAGER, RECEPTIONIST) and existing authorized customers. No customer role is assigned. Booking payloads carry no buyer identity; the API infers the authenticated user and rejects self-bookings.

Successful requests link to `/lich-hen`, which shows only requests sent by the current user, with status, cancellation and a chat link. Incoming KTV work stays in the KTV workspace. Staff accounts do not invoke legacy customer booking APIs. Personal request links are available in account shortcuts and the KTV workspace.

Staff can choose another KTV and open a buyer-side conversation. Recipient labels, service selection, privacy controls and first-message suggestions follow the current thread's buyer identity rather than the user's global staff role. The backend retains participant isolation and self-chat rejection. Existing own-provider Zalo and administrator routing remains intact.

Validation: format, lint, typecheck, 495 tests across 102 suites and production build. Added checks cover KTV/admin submission without `customer.portal`, identity-free payloads, correct tracking links, buyer chat UI and filtering/cancelling sent requests without legacy customer API calls. Actual API submission, outbox routing and authorization are tested against disposable PostgreSQL in the backend suite. Production verification is read-only; no fabricated booking/chat or test notification is sent.
