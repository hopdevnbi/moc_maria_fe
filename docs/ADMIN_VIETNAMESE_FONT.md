# Vietnamese typography in administration

The role-management heading contained correct NFC text (`Trung tâm phân quyền`),
but its computed family was `Georgia, serif`. Several admin features used system
Georgia directly, causing Vietnamese letters to use a different fallback face
on devices without complete Vietnamese glyph coverage.

An admin-only layout now applies a scoped typography policy. Headings and the
existing serif statistics/avatars use the project's self-hosted Noto Serif;
interface text and controls use Be Vietnam Pro. Both fonts already preload the
Latin and Vietnamese subsets in the root layout. No new font downloads or public
page typography changes are introduced.

Only font families are overridden. Existing sizes, weights, spacing, responsive
layout, authentication, permissions and form behavior are preserved. The serif
family rule deliberately overrides feature font shorthands so route CSS chunk
ordering cannot reintroduce system Georgia.

Local verification: formatting, lint (zero errors; two existing appointment-test
warnings), TypeScript, all 140 tests across 35 files and the production build pass.
Production acceptance checks cover computed styles and visual rendering on desktop
and mobile without account or notification configuration writes.
