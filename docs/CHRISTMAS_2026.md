# Christmas 2026 presentation

CODE: Shared seasonal ribbon with a Santa face, forest green/cranberry/gold accents, winter cream surfaces and matching public calls to action. Compact mobile homepage from aa8ea58 is preserved. The event landing adds a lightweight local SVG Santa/tree scene, Christmas copy and six named gift boxes. All image assets are local, vector and original to this change; no additional runtime dependency or animation loop is added.

BOXES: 1 Thông Xanh An Lành; 2 Chuông Vàng May Mắn; 3 Tuyết Trắng Dịu Êm; 4 Điều Ước Đêm Đông; 5 Túi Quà Ông Noel; 6 Ngôi Sao Hy Vọng. The numeric box IDs, server decision, eligibility checks, terms consent, idempotency key, wallet and existing URLs are preserved. Names and wishes are presentation only and do not promise specific prizes. Event schedule, prizes, inventory and membership rules continue to come from persisted server data.

RELEASE DEPENDENCIES: The existing required production npm audit failed on Next 16.4.0 and Zod 3.25.76. Updated Next/eslint-config-next to 16.4.3 and Zod to 4.6.7; production audit reports zero vulnerabilities. Added mocked form-level regressions for login validation/submission and contact-required/phone-only registration; no real account is created.

TEST: Final full quality passed on Next 16.4.3: formatting, lint (three existing unrelated warnings), typecheck, all 215 tests in 56 files and production build (48 generated pages). Production dependency audit: zero vulnerabilities. Mobile event checked at 393px and 320px; the 320px header overflow was fixed by omitting the duplicate sign-up shortcut while the sign-in page retains registration. Desktop event checked at 1440px. Reduced-motion users do not receive gift hover movement. Production smoke evidence is recorded in the scoped release tracker.

COMMIT / DEPLOY: Develop in codex/christmas-2026, integrate into main after validation and push main. Release target: Vercel project moc-maria-fe (prj_F20jtSnoHCmEVoDkSrVR969kHZ6H), team_91IWQsQCRoEdOPmJHWmH0D3n, production aliases mocmaria.com and event.mocmaria.com. Exact source SHA, deployment ID and live verification belong in Plan/14_ACTIVE_WORK.json. Previous deployment: dpl_2ztdjc4ZgMk3tzkQhA1y5GsnisWd at 45bbc68.

BUSINESS_DATA: No database writes, campaign activation, gift openings, membership changes, invented provider identities, rewards or reviews. Production QA is limited to public reads and cosmetic box selection, never the reward-opening request.

COORDINATION: Legacy trackers under C:/Users/User/Desktop/Mộc maria/Plan are unavailable on this machine. Claim/history are maintained at C:/Users/admin/Desktop/DỰ ÁN GIÁO LÝ VIÊN/Plan/14_ACTIVE_WORK.json. Only this worktree's scoped files are committed.

ROLLBACK: Revert the Christmas presentation commit on main and redeploy main. Preserve prior aa8ea58 mobile layout and patched dependency commit. No migration or data rollback is needed.
