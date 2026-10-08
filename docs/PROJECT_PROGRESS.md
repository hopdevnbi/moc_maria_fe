# Mộc Maria Project Progress - Frontend

## Current
- Phase 01 Foundation: DONE
- Phase 02 Auth UI: committed at 34204a4; frontend quality PASS
- Phase 03: backend branch foundation in progress; frontend catalog/schedule UI pending
- Phase 01 implementation commit: 59da268

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
