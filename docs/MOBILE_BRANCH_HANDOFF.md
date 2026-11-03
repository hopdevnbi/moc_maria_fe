# Mộc Maria React Native — Handoff `main-mobile`

**Ngày:** 03/11/2026
**User request:** dùng chung FE Git repository, nhánh riêng `main-mobile`, triển khai mobile React Native gọi cùng BE API, không tác động website đang hoạt động.

## Git isolation

- Base: `origin/main` tại `ededbe0` khi tạo nhánh.
- FE main gốc: `D:\DASH vs Shopify\Acutis Education\Mộc Maria\moc_maria_fe` (có 16 modified/untracked entries trước audit), **không sửa/stash/reset/commit**.
- Mobile worktree: `D:\DASH vs Shopify\Acutis Education\Mộc Maria\moc_maria_fe_main_mobile`, branch `main-mobile`.
- Source: `apps/mobile/**` mới, React Native + Expo SDK 58. Root `src/**` Next.js và BE/Chat/Queue giữ nguyên.
- Release: **không** merge sang `main`, không deploy Vercel/K8s, không push lên nhánh production.

## CODE

- React Native 5 bottom tabs, public KTV/services, detail pages, API client, native auth session, inquiry, customer chat, wallet, KTV workspace read-only.
- API: `https://api.mocmaria.com/api/v1`; private Bearer access token; không nhúng secret.
- Official Mộc Maria logo lấy từ public/brand của FE.
- QA/build và hạn chế P0 được ghi tại `apps/mobile/README.md`, kế hoạch lưu `apps/mobile/docs/plan/`.

## CONTRACT & BLOCKERS

- Native refresh cần backend additive riêng; browser cookie-only refresh không được giả lập.
- 3 route booking `/bookings/*` từ web chưa xác minh có ở BE checkout; native chỉ gửi `/appointment-inquiries`.
- Chat cá nhân ở Mộc Maria BE/Postgres; shared Socket.IO chỉ có catalog revision, Queue server-to-server.
- Chưa triển khai push, QR redeem hoặc đổi trạng thái KTV do cần BE/state-machine contract và QA.

## VALIDATION & DEPLOY

- Run mobile typecheck, Android/iOS Expo export và CI; không chạy quality root web vì root không đổi.
- Chưa gọi API làm thay đổi production, chưa tạo khách/tin nhắn/quà thật.
- Không triển khai lên Store hay deploy Backend từ nhánh này.

## NEXT

1. Xác minh contract auth native refresh và booking trên staging.
2. Kiểm tra hoạt động và UX trên Android/iOS thật.
3. Xây thêm trạng thái booking, chat privacy/older-history, KTV status transitions đã xác nhận.
4. EAS setup, signing, privacy và rollout theo QA checklist.
