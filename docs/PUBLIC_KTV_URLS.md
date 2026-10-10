# Public KTV and service URLs

Continue the existing remote work in `d33f44d` (`codex/fix-ktv-directory-demo`): that commit introduced named KTV profile slugs but was not merged and did not finish booking/query aliases. Reused its provider slug helper/tests and adapted profile links to current chat directory, description overlays and booking flow.

Public profiles now use `/chuyen-vien/linh-anh`; booking uses `/dat-lich?provider=linh-anh`. Ten named slugs map to the same existing internal provider identifiers. Legacy profile/booking/chat/service links permanently redirect to their clean public equivalents. Service and variant query aliases also omit `demo`. Other query values remain intact. Existing conversation IDs, KTV accounts, inquiry receivers, eligibility and reservations are unchanged.

All public navigation sources use the helpers: homepage, profile, service details, account search, chat profile link and booking CTA. Internal seed filenames/IDs are retained for compatibility; this change does not rename database identities or pretend new operational approvals.

Verify: all ten slugs are unique, legacy aliases round-trip to exact internal IDs, services/variants resolve correctly, old bookmarked URLs redirect, and the selected KTV remains selected on desktop/mobile booking.
