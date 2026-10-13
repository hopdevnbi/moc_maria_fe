# Booking defaults — 2026-10-13

Opening `/dat-lich?provider=linh-anh` selects that KTV and the first service in the displayed catalog that the KTV offers. A compatible explicit service link takes precedence. Selecting another KTV retains a compatible service or selects the first compatible replacement. Generic booking entry still lets the customer choose the service.

The requested time and minimum selectable time start at now plus one hour in Hanoi (UTC+7), rounded up to the next minute. Date/month/year rollover uses timestamp arithmetic. The maximum remains 60 days. A restored sign-in draft can retain a valid service and time; an expired/out-of-range time cannot replace the new default.

The customer can change both values. No request is submitted automatically; existing address requirements, API payload, idempotency and server validation remain in place. This only affects appointment inquiries, not the separately verified reservation flow. No backend, migration or production booking data changes.

Validation covers KTV preselection, explicit service precedence, incompatible drafts, Hanoi midnight/year rollover, past-time rejection and existing request/retry behavior. Release evidence will record CI and production verification separately.
