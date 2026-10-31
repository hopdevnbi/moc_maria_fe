# Mobile homepage, 2026-11-01

- CODE: Compact hero at viewport widths up to 700px. Hide the repeated hero logo, brand kicker, second tagline, description and notes. Keep a short greeting, emphasize the KTV selection action and reduce space above the directory. Desktop styles and persisted provider data are unchanged.
- BASE: Fetched origin/main before editing; base 45bbc68. Isolated branch codex/mobile-home-compact-20261101.
- TEST: Prettier and git diff --check passed. Existing homepage suite: 11/11 passed. Production build, including TypeScript and 48 static pages, passed after replacing the worktree dependency junction with a local dependency copy.
- BROWSER: Local production server at http://localhost:3101. At 393x852 the hero is 123px tall and the first provider card begins at approximately y=380px. KTV anchor and search verified with existing public records (10 profiles, search Thu Hà returns one). No horizontal overflow at 320px or 393px. At 1280px the two-column hero, logo and description remain visible.
- COMMIT: See Git history for this document and home.css; integrate with a fast-forward into local main after validation.
- DEPLOY: Not pushed or deployed as part of this UI edit.
- BUSINESS_DATA: No records created or changed. Public API reads only.
- COORDINATION: Legacy C:/Users/User/Desktop/Mộc maria/Plan files are absent on this machine. Scope and handoff recorded in C:/Users/admin/Desktop/DỰ ÁN GIÁO LÝ VIÊN/Plan/14_ACTIVE_WORK.json; no existing claims overwritten.
