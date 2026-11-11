# Open support from administrator Zalo alerts

Administrator Zalo alerts previously used the generic booking-management URL. The owner selected support inside the existing customer–KTV conversation. New inquiry links carry the exact persisted inquiry ID with `support=1`; chat links carry the exact thread ID with the same flag.

`/tin-nhan` retains the entire locator through login and calls the explicit authenticated support entry. Only an active SUPER_ADMIN with the required administrator/customer-management permissions can enroll. The backend binds a 24-hour actor-specific grant to the exact conversation, audits entry and messages, checks current permission on subsequent requests, and does not open password-protected chats to third-party support. Ordinary KTV/customer links continue using their existing participant-only entry.

Supporting admins see both the customer's and KTV's names, a support-mode notice and their own identity. Every viewer sees the true administrator display name and “Hỗ trợ Mộc Maria” on support messages. Participant block/password controls remain unavailable to supporting admins, and their reads do not mark messages read for either original participant. Existing participants retain their normal controls and chat behavior.

Verification covers login returnTo, both support locator types, honest sender attribution, existing chat behavior and isolated real PostgreSQL authorization/message/outbox cases in the backend suite. Production verification must not fabricate messages or bookings. Previously sent Zalo messages keep their old URL; new notifications use the corrected link. Deploy the backward-compatible frontend first, then roll out the backend that emits the new support links. Existing URLs keep working during the transition. Keep all 51 backend environment entries and bot Secret references during the image rollout.

