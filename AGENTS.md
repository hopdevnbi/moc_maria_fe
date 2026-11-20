<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Mộc Maria collaboration

Read C:/Users/User/Desktop/Mộc maria/Plan/99_PROJECT_STATUS.txt, 13_TASK_LEDGER.json and 11_WORK_COORDINATION.md before edits. Claim scope in 14_ACTIVE_WORK.json before writing. Keep other agents changes; use isolated worktrees; no reset/clean/force push. Read docs/WORK_COORDINATION.md for ownership and release rules.

## Owner release and public content preferences

Production releases must be pushed to `main` and deployed from `main`. Use isolated worktrees for development, then integrate into `main` after validation.
Public KTV and service copy must not contain “demo”, “minh họa”, or “ví dụ”. Use existing persisted business records and owner-provided content; ask for missing factual data rather than inventing identities, qualifications or reviews. Existing internal identifiers remain compatible with saved links and chat history.

## Mandatory internationalization rules

**Blocking acceptance criterion for every feature and bug fix (owner requirement, 2026-11-20):** Before editing, audit the entire touched user journey, including linked routes, shared components, modal/dialog, action labels, form fields, placeholders, validation, API error/status mappings, success/empty/loading states, notifications, accessibility, and text-bearing assets. If any legacy text in that scope lacks i18n, fix it in the same task, not a future TODO. New features and old fixes both require all six locales. Reuse existing semantic keys; do not hardcode a default-language UI or suppress missing translations. Keep original business facts, user-generated content and IDs. For owner-provided images containing text, preserve the asset and provide a faithful localized accessible/visible equivalent or reviewed localized assets; never fabricate offers. Add parity/placeholder tests and exercise every locale in the affected workflow, including language switching, state preservation and mobile/desktop layout. Review the diff for untranslated literals before release. Do not mark the task done or deploy with known untranslated static UI in its scope; document any external or dynamic content that cannot be translated safely.
Read docs/I18N_ROADMAP.md before any task. Supported locales: vi (default), en, ko, ja, zh-CN, ru. All new or changed user-facing strings must use semantic message keys with six translations (including errors, validation, aria, empty/loading states and metadata). Preserve Vietnamese fallback, stable API IDs/enums and original user messages. Locale is not authorization, currency or timezone. Use locale-aware cache keys when returning translated data and preserve public IDs and URLs. Do not enable untranslated modules in production. Review dynamic business translations, never invent claims or log raw IPs. Follow existing ownership and migration gates.
