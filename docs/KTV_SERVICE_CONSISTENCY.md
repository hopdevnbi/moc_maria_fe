# KTV service consistency — 2026-10-13

The homepage filter used every assigned offer but each KTV card rendered only the first three. This hid Gội đầu sạch on the three matching profiles. Cards now display all assigned services, including fourth/fifth rows.

Names and prices use the same ten-item care menu as /dich-vu. Legacy selections resolve by stable menu slug instead of array position. The same label resolver is used in chat consultation choices, appointment request choices/search, quick-search directory and existing service-detail links. Appointment and service-detail prices use the current menu; outdated legacy duration packages are not presented as current menu data. Existing wire IDs and saved URLs remain compatible.

Gội đầu sạch is assigned to Mai Anh, Thanh Trúc and Minh Châu and displays 49,000 VND. All existing assignments remain intact. No new eligibility decisions, approvals, account data, bookings or database migrations are part of this release. Approved providers continue to use backend catalog/eligibility data.

Validation: 106 frontend tests pass, including rendered-card regressions for all ten service filters; complete rows/prices; canonical inquiry choices and preserved API IDs; canonical chat drafts; directory search and old service-detail links. Formatting, lint (two existing test warnings), typecheck and production build checked before publishing. Production release is a fast-forward push to main followed by the main Vercel deployment. Exact commit, CI, deployment and live verification evidence is recorded in the scope's Plan/14_ACTIVE_WORK.json release entry.
