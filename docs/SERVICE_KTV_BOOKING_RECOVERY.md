# Service menu → seven KTV → booking inquiry

The published service menu uses real catalog UUIDs. Legacy KTV service assignments used other IDs, so the booking form filtered out all seven KTV. The dropdown also mixed drinks and duplicated the care services from the legacy catalog.

The advisory booking form now prefers published official care services, deduplicates their legacy equivalents, resolves historical links to the canonical service ID and keeps the selection when changing KTV. All persisted KTV can receive a care-service inquiry; the KTV still confirms service suitability and timing. The verified appointment flow and its eligibility rules are unchanged.

The new picker shows real roster portraits, existing public specialties and area, a seven-KTV count, search with a clear/recovery action, and an explicit selected state. It uses keyboard-accessible buttons, responsive cards and the existing mobile booking CTA. No qualifications, reviews or availability claims are invented.

Regression coverage includes all seven selected receivers, exact catalog UUID in submitted requests, duplicate/drink exclusion, service changes, empty-search recovery, historical links and the existing guest signup/login/idempotency flow. Browser checks use the real public directory, verify loaded portraits and mobile overflow, and open the quick-account dialog with preserved selections. Successful persistence is verified through the backend's disposable PostgreSQL HTTP tests, not real customer requests.

Backend support must be deployed first. Production customer permission requirements still apply; a KTV-only account receives inquiries and cannot submit customer bookings.
