# Nguyễn Hoàn — cập nhật bộ sưu tập, 04/11/2026

Profile: https://mocmaria.com/chuyen-vien/nguyen-hoan
Application ID: `a9bac445-926a-4bb6-9778-b4b599f6c2e2` (public alias retained).

## Media and business data

14 original JPEGs, no video. Selected 7: `10.jpg`, `12.jpg`, `1.jpg`, `5.jpg`, `7.jpg`, `4.jpg`, `2.jpg`.
Excluded: `13.jpg` duplicates `10.jpg`; `3.jpg` includes a social-profile screenshot; `9.jpg` and `14.jpg` include another person; `6.jpg` and `8.jpg` repeat similar studio compositions; `11.jpg` omitted to keep the selected set visually consistent. No source files were modified.

Existing production Sharp conversion: EXIF rotation, max 1600 px without enlargement, WebP quality82. No generative retouching or facial/body alteration. Total 405944 bytes; individual files 15392–124228 bytes.

Existing authenticated SSH infrastructure was used after native-browser input was blocked by concurrent user input. Uploaded only to the target provider CDN prefix using the API deployment’s existing storage configuration; no secret/config changes. Read and backed up the absent app_metadata row before writing. Used the existing server media validator, verified the public provider gate, acquired the same transaction advisory lock, rechecked the provider and absent record, inserted showcase version1 and eight honest infrastructure-attributed audit records (null user actor). A concurrent profile insert would abort instead of overwrite. No authentication token or user session was created.

Preserved avatar, provider identity, introduction, reference hours, services, prices, ratings, bookings and user permissions. Showcase headline/biography/scheduleNote remain empty and weeklyHours remains empty. The public provider record matches its before snapshot exactly.

## Published CDN URLs

1. 10.jpg → [Chân dung Nguyễn Hoàn](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/e6c8a9c2-32e7-4006-a8b0-966af8a2ffeb.webp) — 1067×1600, 33980 bytes
2. 12.jpg → [Khoảnh khắc đời thường](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/c05baea5-f8b1-4606-ac9e-cb0a155481a8.webp) — 768×1344, 96058 bytes
3. 1.jpg → [Chân dung với trang phục trắng](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/b7c2acfa-9825-4eaf-a54d-8b3921753a54.webp) — 641×960, 15392 bytes
4. 5.jpg → [Bộ ảnh chân dung tông ấm](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/9cf09496-ebc6-4d7f-a683-8c1fdb8b7c85.webp) — 1067×1600, 58248 bytes
5. 7.jpg → [Chân dung bên rèm cửa](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/0d431381-8e90-43ba-bdea-e545def00bfa.webp) — 1067×1600, 37118 bytes
6. 4.jpg → [Khoảnh khắc trong bộ ảnh cá nhân](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/45cff00d-2cc7-4921-be0a-e63d4e34b958.webp) — 1600×1067, 40920 bytes
7. 2.jpg → [Chân dung với trang phục màu vàng](https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-showcase/a9bac445-926a-4bb6-9778-b4b599f6c2e2/fb6fa70b-d5fe-478d-87bb-a9131a2dc11d.webp) — 1067×1600, 124228 bytes

## UI correction

Portrait clipping found in the live gallery: image-only `object-fit:cover` overrides the shared contain rule. Remove that override and give mobile gallery a4:5 frame so full portraits fit. No route, component logic, booking or backend source change.

## Validation

All seven CDN URLs return200 and image/webp with matching Content-Length. Public showcase GET returns version1 and7 images. Browser confirmed gallery captions,7 thumbnails, all loaded images, unchanged avatar and booking/chat links. Final CSS build/CI/deployment and responsive checks recorded in the handoff report.
Local validation: CSS formatting, four existing showcase tests, TypeScript and production build (49 routes) PASS. Final production SHA, deployment, CI and responsive browser evidence are recorded in the scoped Plan claim and output REPORT.md.
