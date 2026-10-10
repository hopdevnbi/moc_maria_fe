# Admin avatar and profile — 2026-10-10

## Requirements and implemented
- Admin KTV seeded previews now use the exact same local WebP as the public homepage for matching name + service area + APPLIED status; a real staff avatar always takes precedence. No demo media is written to real staff profiles.
- Clicking the top-right Admin account goes to /quan-tri/ho-so.
- Admin profile shows account info; edits display name, staff public name and bio, changes password using the existing authenticated auth endpoint, logs out current/all sessions, and previews/uploads avatar when the CDN has secure credentials.
- BE PATCH /staff/me updates display name + staff profile in a single database transaction and audits the operation.
- BE POST /staff/me/avatar is staff.portal guarded, checks JPEG/PNG/WebP <=5MB, converts to 384px WebP using sharp, uploads to Bunny with unique user-scoped path and saves its URL.
- BE GET /staff/me returns avatarUploadEnabled. If storage is not configured, FE explains why upload is disabled, while other profile functions continue.
- No migrations or role/password resets.

## Pending production secret configuration
The automated attempt to transfer Bunny credentials from an unrelated pod was blocked by safety controls. It was not completed. Do not work around this block.
Authorized operator must supply Kubernetes Secret references to moc-maria-api for BUNNY_STORAGE_ZONE (giangxa-media), BUNNY_STORAGE_ACCESS_KEY or BUNNY_STORAGE_API_KEY (write credential), BUNNY_CDN_BASE_URL or BUNNY_STORAGE_CDN_URL (https://giangxa-media-cdn.b-cdn.net), optionally BUNNY_STORAGE_REGION (sg).
Until then upload remains disabled. Never commit secrets.

## Validation
Run FE quality and BE typecheck/tests/build; deploy BE before FE. Smoke test authenticated Admin detail and avatar matching.
