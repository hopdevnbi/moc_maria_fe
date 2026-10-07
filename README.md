# Mộc Maria Frontend

Independent Next.js frontend for the Mộc Maria Wellness Platform.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query
- React Hook Form + Zod

## Local setup

1. Copy .env.example to .env.local.
2. npm install
3. npm run dev
4. Open http://localhost:3000 unless a custom port is selected.

During full-stack local development the intended convention is:
- API: http://localhost:3000/api/v1
- Web: run with npm run dev -- -p 3001

Production deployment is intentionally deferred until Phase 08.