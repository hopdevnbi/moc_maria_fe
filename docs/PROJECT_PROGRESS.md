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
