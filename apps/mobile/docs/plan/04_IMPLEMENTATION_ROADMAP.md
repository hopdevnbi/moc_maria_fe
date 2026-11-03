# 04 — Roadmap triển khai React Native (chưa bắt đầu code)

## Mục tiêu và thứ tự ưu tiên

Ứng dụng một codebase Android/iOS, ưu tiên khách hàng và những chức năng đang chạy thực trên website. Không xây admin console native trong MVP. Các phase là **cổng nghiệm thu tuần tự**, không ước lượng tiến độ cố định khi chưa có số lượng nhân lực/thiết bị.

## P0 — API contract và nghiệp vụ (BLOCKER)

**Việc:** xác nhận khác biệt source–runtime/Swagger read-only trên môi trường cho phép; thu thập DTO thành contract versioned.

- P0.1: xác minh GET /auth/me, login/register, 401/403, access JWT expiry.
- P0.2: chốt native refresh (cookie-native có chứng cứ hoặc mobile-specific endpoint bảo mật), rotation, revocation, logout-all và test đa thiết bị.
- P0.3: xác minh /bookings/requests, /bookings/me, /bookings/:id/confirm-quote có thật hay không ở BE đang deploy; nếu không, MVP chọn /appointment-inquiries và nhãn trạng thái chuẩn. Không tự tạo giả endpoint trong RN.
- P0.4: chốt directory profile/alias/demo, ảnh approved, chỉ mục được book, service/price nguồn thật.
- P0.5: các DTO cho chat, upload ảnh, gift wallet, KTV fulfillment; policy quyền theo role.

**Output:** bản API contract cuối, state machine booking, decision auth, bảng gap/owner.
**Exit:** không còn GAP P0 cho bất cứ màn hình nào dự kiến release.

## P1 — Foundation ứng dụng độc lập

**Chỉ thực hiện SAU khi duyệt bộ plan.**

- Dùng nhánh FE riêng `main-mobile`, khởi tạo ứng dụng `apps/mobile` (Expo SDK 58 + TypeScript + Expo Router), giữ nguyên website `main`. Đã dựng scaffold và màn hình nền tảng; EAS/cloud credentials/device acceptance chưa thực hiện.
- Tạo cấu hình dev/staging/prod, EAS profile, app identifiers, signing/secrets qua vault/build platform (không commit secret).
- Design system native Mộc Maria: typography tiếng Việt, màu, grid, hình ảnh thương hiệu, loading/error/empty, accessibility.
- API client typed, request-id, auth middleware, TanStack Query, network state, crash/error logging không PII.
- Unit tests cho formatter VND, timezone, HTTP wrapper; CI lint/typecheck/test.

**Exit:** Android/iOS dev build mở được màn hình shell; không cần BE thay đổi để dựng UI public; không dùng dữ liệu mock làm production.

## P2 — Auth + account foundation

- Native login/register/forgot/change password; role navigation CUSTOMER vs THERAPIST/STAFF, chặn admin UI nếu chưa yêu cầu.
- Secure token/session, single-flight refresh, clear cache on logout, switch user và app resume.
- Customer profile, avatar upload/multipart, validation và state lỗi.
- Không lưu password/token trong AsyncStorage, logs, screenshot hoặc URL.

**Exit:** qua test login→close app→open→refresh→logout, revoke session, 401/403, iOS và Android thật.

## P3 — Public discovery + booking/inquiry

- Trang chủ, danh sách và lọc KTV, KTV detail, danh mục/chi tiết dịch vụ, branch.
- Ảnh thật và danh sách approved; loading/error/empty; search tiếng Việt bỏ dấu; clear filters.
- Chỉ gọi flow booking được P0 chốt: nếu inquiry, gửi /appointment-inquiries; nếu booking chính thức verified, dùng availability và server quote, xác minh tất cả status.
- Bảo vệ double submit và idempotency key; timezone VN; validate giá server.
- Lịch/yêu cầu cá nhân theo API thực, không hứa giữ slot nếu chưa confirm.

**Exit:** customer end-to-end từ tìm KTV tới gửi yêu cầu, xem lại trạng thái và retry an toàn trên staging.

## P4 — Customer chat + quà

- Inbox, unread, thread, send text, ảnh, phân trang, long-poll updates, retry identity, read receipt.
- Privacy lock/unlock/password, block/unblock nếu MVP; xử lý nhạy cảm và khóa khi background theo chính sách.
- Gift event + wallet, code/QR theo dữ liệu BE; quà chỉ xác nhận từ server; không giả lập kết quả quay.
- Các luồng đổi quà/QR scanner tại quầy có thể chuyển P5 nếu role/thiết bị chưa sẵn sàng.

**Exit:** 2 tài khoản thực nghiệm gửi/nhận đúng và không trùng tin; mất mạng, reconnect, logout; voucher đã dùng không tái sử dụng.

## P5 — KTV workspace + trải nghiệm native bổ sung

- KTV dashboard/yêu cầu được phân công, nhận/từ chối, start/complete, trạng thái fulfillment có version và xác nhận đã phục vụ.
- KTV profile/avatar, an toàn nếu có quyền và các form cần thiết; đào tạo/onboarding theo ưu tiên.
- Optional: Socket.IO public revision, deep links, camera scanner, thông báo đẩy.
- Push chỉ mở khi backend có device registration, event mapping, notification policy, queue handler, retry/cleanup/opt-out; nếu chưa, để backlog riêng.

**Exit:** RBAC đầy đủ cho KTV, chuyển trạng thái đúng và không tăng/giảm quyền so với website; background/permission kiểm thử.

## P6 — Stabilization, security, release

- Lint/typecheck/unit/integration, E2E Android/iOS; kiểm thử migration-free backend compatibility và API contract.
- Performance: startup, list ảnh/KTV, long-poll, memory, upload thất bại; test 4G/throttle/offline.
- Biometric/PIN chỉ sau khi đánh giá nhu cầu; privacy policy, account deletion workflow, cửa hàng app và store declarations.
- EAS staging internal preview → closed test → production, rollout tăng dần, crash/report monitoring.
- BE additive deploy trước app nếu có yêu cầu; rollback mobile không ảnh hưởng website; không sửa trực tiếp data production để thử nghiệm.

**Exit:** checklist QA 100%, test thiết bị thật và sign-off nghiệp vụ; không còn blocking issues.

## Dependency/order

P0 contract → P1 native skeleton → P2 auth → P3 customer business flow → P4 chat/gift → P5 KTV/optional native → P6 store release.

P3 public UI có thể thiết kế song song P2 nhưng không tích hợp chức năng private trước khi auth P0/P2 có kết quả.

## Không làm trong giai đoạn hiện tại

- Không tạo repo mobile, app config, backend endpoint, migration hay pull request.
- Không can thiệp FE dirty working tree, không commit/push các repo, không deploy, không gửi thông báo/quà/email, không tạo dữ liệu giả lên production.
- Mọi task tiếp theo sẽ dựa trên version baselines và quyết định ở 07_DECISIONS_BACKLOG.md.
