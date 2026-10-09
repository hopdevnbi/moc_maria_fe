# Mộc Maria Project Progress - Frontend

## Current — audited 2026-10-09
- Phase 01/02 foundation closed; Phase 03 IN_PROGRESS, P03-T26. MVP not operational.
- Production API/database/TLS and Vercel frontend healthy. Catalog/providers currently empty.
- Catalog/branch/applicant/training/admin foundation deployed; isolated private browser QA PASS. Booking/chat/reviews/media/queue and full schedule/eligibility remain missing.
- Detailed current status: [CURRENT_PROGRESS_2026-10-09.md](CURRENT_PROGRESS_2026-10-09.md). Sections below preserve historical evidence; old pending labels may be superseded.
- Latest validation: BE 17 unit + 20 isolated integrations; FE quality + 4 unit + 22-route build PASS. Small QA fixes/helper remain uncommitted and undeployed.

## Phase 01 completed
- [x] Next.js 16 + React 19 + TypeScript foundation
- [x] Tailwind CSS 4 design tokens
- [x] TanStack Query provider
- [x] React Hook Form + Zod dependencies
- [x] Environment resolver and MOC_MARIA integration constants
- [x] Root layout and SEO metadata foundation
- [x] Loading / route error / not-found boundaries
- [x] Branded homepage foundation
- [x] Dockerfile authored
- [x] GitHub quality workflow
- [x] Secret scan clean
- [x] Production dependency audit: 0 vulnerabilities

## Phase 01 validation
- Install: PASS
- Format: PASS
- Lint: PASS
- Typecheck: PASS
- Tests: PASS
- Next.js production build: PASS
- Production homepage smoke: HTTP 200, Mộc Maria brand rendered
- Production dependency audit: PASS, 0 vulnerabilities
- Docker image execution: not run because Docker CLI is not installed on this workstation.

## Production API integration — 2026-10-08
- Backend HTTPS API deployed with verified database TLS and production auth smoke PASS.
- Vercel production NEXT_PUBLIC_API_BASE_URL configured to https://api.mocmaria.com/api/v1. No secrets are exposed in public environment.
- Production fallback uses HTTPS API rather than localhost; public API URL rejects embedded credentials and unsafe schemes. Logout checks server response before clearing local state.
- Dedicated managed FE worktree and codex/platform-integration branch preserve the primary checkout for other AI work. Existing homepage/logo/typography retained.
- Full UI/API and browser verification pending; product phases 03–08 remain open.

## Marketplace and existing API integration — 2026-10-08
- Retained existing brand/logo/fonts, premium homepage imagery and botanical borders. Homepage now reads actual catalog/provider APIs, includes quick search, application/training introduction and truthful FAQ. No fabricated catalog, prices, staff, certificates or reviews.
- Public catalog/list/detail, price table, provider list/detail; real API loading/empty/error states and native server rendering.
- Applicant self-application/status and own training/certificates integrated; internal certificates distinguished from governmental licences. No self-approval/certification actions.
- Permission-guarded admin UI for categories/services/variant price/edit, branches/resources/hours/exceptions/service mappings, applications/training/enrollment/assessment/certificate issue/revoke. Broader booking/chat/reviews/media administration remains open.
- Private React Query state keyed by user and cleared on logout/account switch; authenticated API requests are no-store. Account page links actual areas; logout-all refreshes expired access token and handles failures visibly.
- Avatar accepts reviewed local media only until dedicated CDN pipeline is ready.
- Validation: format/lint/typecheck, 4 existing unit tests and Next production build PASS. Public catalog mobile at 390px shows no horizontal overflow; anonymous admin route redirects to sign-in with returnTo. Full private admin browser flow and deployment verification remain pending.
- Backend companion source ffc89b3; 17 unit and 20 isolated PostgreSQL integration checks PASS. No production fixture seed/reset.
- All product phases 03–08 remain open.

## Stage A/B — 2026-10-09
- Reconciled task-level phase checklists and ownership registry; safe Plan mirror committed in .project/plan. Stages A-H defined; current Phase 03 remains open.
- Stage A QA fixes deployed on Vercel dpl_7aBE3CnHZazqB7YfZJQiqy2gfrSh; public browser PASS.
- Stage B contact/consent and own application edit implemented; actual private/admin/browser/mobile QA PASS; 21 integration tests; source build/quality checks PASS before final edit rerun. New additive migration deployment pending.
- Application backup and disposable restore drill PASS; actual database never seeded by QA. Details in backend backup drill/contract docs.

Stage B release verified: BE cd51766c6be91abf44da2d7bdf6b987291dddb7c, image sha256:d3863e3403ad0e7cc2e9b7158e2f9f0eba04c55def94c19d9098b062020565c4, schema10; FE fcb2b66daa015f6cd52aa4d4c9359ad8a53e39cf, dpl_HaZaKDoqbpQ3ZhmGrofGgXfePmJs. CI/quality PASS; health200, anonymous private401; isolated21 integration/browser flows and pre-migration restore PASS. Stage C starts next.

Stage C1 release preparation: skills/branch assignments/weekly/date schedules/private planning implemented; 21 unit BE and26 isolated integrations PASS including simultaneous overlap writes. Fresh11 migrations and rollback/reapply PASS. FE quality/build/4 unit PASS; browser create/overlap/leave/reload/mobile390 no overflow PASS. Production before migration still10; private public-schema backup61239 bytes SHA256 e7ad5690c6be0732f538a7c497da1db29a12b5bc8c76da26542b493eac090845 restored into disposable DB:10 migrations/26 tables/7 roles/8 permissions. Source and live deployment pending; no production fixtures.

Stage C1 verified LIVE: BE 4544c60663cf6d4f5e3876106a599d48e101eadf, sha256:017cc71c5607016f3739253b97a7aa1f48e8f1c94e3c1cd6fe244830b4a2ad68, migration11; FE 07cdc199b111d7f8d350ba45cf2963ddb2db0183, dpl_BPkUaftignL4U8NpGYtUZPHeLoJm. Quality/CI/browser/backup restore PASS. API healthy; anonymous planning401/private,no-store. No business fixtures. C2 in progress; Phase03 gate open.
