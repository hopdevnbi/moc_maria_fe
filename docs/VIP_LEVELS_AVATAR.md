# Numbered VIP levels and customer avatars

Admins select a numbered VIP level (1–99), expiry and audit reason in the existing
customer/VIP management form. Active historical VIP records without a stored level
remain VIP1. Level assignment is manual; no automatic financial benefits or upgrades
are introduced. Account badges, profile cards and admin lists display the same level.

Only active VIP customers can select and save an avatar. The API verifies membership
before a CDN upload and again inside the persistence transaction, so an expired or
revoked membership cannot bypass the client controls. Existing avatars are retained
when membership ends.

The existing Sharp/Bunny implementation processes JPG/PNG/WebP up to5MB into a
384px square WebP, with a unique CDN path under `moc-maria/customer-avatars/`.
Runtime storage credentials are scoped to the Mộc Maria API Secret; other services
and Giang Xá configuration remain unchanged.

QA covers legacy/default levels, admin-assigned levels, API expiry/revocation checks,
upload-preview/save UI and existing profile/storage behavior. Customer mutation
fixtures are restricted to isolated PostgreSQL.
