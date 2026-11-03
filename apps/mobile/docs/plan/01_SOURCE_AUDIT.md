# 01 — Audit bốn repository

**Ngày:** 03/11/2026. **Phạm vi:** đọc checkout local (không chạy test, không dùng secret, không chạm production).

## Baseline Git

| Repository | Branch | HEAD lúc audit | Worktree |
| --- | --- | --- | --- |
| moc_maria_fe | main | cf3f147 | **Dirty**: các thay đổi chưa commit trong AppProviders, mobile experience, KTV workspace, gift-events, contact... |
| moc_maria_be | main | c7addc8 | Clean |
| acutis_education_chat | master | bdcd1f1 | Clean |
| acutis_education_queue | master | 6437b04 | Clean |

Không reset, stash, sửa hoặc commit các thay đổi của FE. Các bản kế hoạch lấy hành vi từ **working tree hiện tại** và phải re-audit nếu các repo thay đổi trước ngày code.

## Frontend Next.js

- Source: moc_maria_fe/package.json, src/app, src/features/mobile, src/features/marketplace, src/features/auth.
- Next.js App Router + React + TypeScript + TanStack Query + socket.io-client, React Hook Form/Zod.
- Màn hình khách: home, chuyên viên/chi tiết, dịch vụ/chi tiết, đặt lịch, lịch hẹn, tin nhắn, tài khoản, hội viên, đăng nhập/đăng ký, quà và voucher.
- Màn hình KTV: workspace/yêu cầu lịch, hồ sơ, đào tạo, an toàn, chat. Quản trị web: người dùng/role, KTV, cơ sở, dịch vụ, khách hàng, báo cáo và sự kiện.
- REST base URL production lấy mặc định từ src/shared/config/environment.ts: https://api.mocmaria.com/api/v1.
- Dữ liệu server-composed không được bê sang native nguyên xi: src/app/api/mobile/directory/route.ts, availability/route.ts, service/[slug]/route.ts, public-revision/route.ts.
- src/features/mobile/data.ts kết hợp catalog, KTV thật, chat provider, official roster và demo. src/features/mobile/provider-directory.ts ghép profile dựa trên publicAlias. Native cần tách **real approved/schedulable** khỏi demo, và không dùng bookingHref web làm native deep link.
- src/features/mobile/useCatalogRealtime.ts dùng https://chat.giangxa.com/moc-maria-updates + fallback GET /api/mobile/public-revision. Đây là realtime thay đổi public catalog, không phải chat cá nhân.
- React Native không tái sử dụng Next server components, CSS, DOM, window/document, next/link và next/image; có thể tái sử dụng DTO, validation, hàm thuần sau khi tách đúng môi trường.

## Backend NestJS + PostgreSQL

- Source: moc_maria_be/src/app.module.ts, app.constants.ts, bootstrap/configure-application.ts và src/modules.
- API global prefix /api/v1; app.module khai báo Auth, Profiles, Branches, Catalog, Providers, Bookings/Availability, Customer Experience, KTV Chat, Reviews, Gift Events, Safety, Admin.
- Authentication: JWT Bearer để gọi private API; login/register trả accessToken và user. Refresh phiên rotate tại src/modules/auth/auth.service.ts; controller đọc HttpOnly cookie moc_maria_refresh, không nhận refresh token trong JSON.
- Middleware trong bootstrap/configure-application.ts từ chối request auth dùng cookie refresh nếu không có Origin; cần xem xét cho native (P0).
- RBAC: SUPER_ADMIN, ADMIN, BRANCH_MANAGER, RECEPTIONIST, THERAPIST, DOCTOR_CONSULTANT, CUSTOMER; quyền server là nguồn sự thật (src/modules/identity/identity.constants.ts).
- Public API đã quan sát controller: /services, /services/:slug, /providers, /providers/:id, /branches, /availability, /availability/earliest, /ktv-chat/providers, /provider-display, /provider-presentation.
- Private API đã quan sát controller: /auth, /customers/me, /staff/me, /appointment-inquiries, /provider/inquiry-fulfillments, /ktv-chat/threads, /gift-events, /ktv-safety.
- Multipart: /customers/me/avatar, /staff/me/avatar, /ktv-chat/threads/:id/images; mức giới hạn HTTP 5 MB trên các controller đọc được. Phải xem thêm validation MIME, quyền và xử lý ảnh trong service khi xây native.

### Điểm lệch API booking — P0 phải đối chiếu

- FE src/features/mobile/booking.tsx gọi **POST /bookings/requests** với variantId, branchId, startsAt, providerApplicationId, idempotencyKey, expectedTotalVnd.
- FE src/features/mobile/appointments.tsx gọi **GET /bookings/me** và **POST /bookings/:id/confirm-quote**.
- BE src/modules/bookings/bookings.controller.ts tại checkout hiện chỉ thấy **GET /availability**, **GET /availability/earliest**, GET/POST /admin/booking-settings. Tìm trong source không thấy controller của ba endpoint /bookings/* kể trên.
- FE src/features/mobile/appointment-request.tsx **POST /appointment-inquiries**; BE src/modules/customer-experience/experience.controller.ts có route thật. DTO là idempotencyKey UUID, providerId UUID, serviceId, location, address, requestedAt ISO, notes. Quy trình này là yêu cầu tư vấn/đặt hẹn, khác luồng slot+quote.
- **Không khẳng định site production hỏng**: cần đối chiếu endpoint và hình thái đặt lịch đang sử dụng thực tế trước code. Nếu MVP sử dụng inquiry, phải hiển thị là **yêu cầu chờ xác nhận**, không quảng bá thành lịch được đặt chắc chắn.

## Chat chính của Mộc Maria

- Tin nhắn khách-KTV: src/modules/ktv-chat trong **Mộc Maria Backend + PostgreSQL**. Web src/features/mobile/chat.tsx tương tác /ktv-chat/threads, messages, images, read, block/unblock, password/privacy và long-poll /updates?after=...
- Luồng gửi dùng clientMessageId/idempotency; lịch sử phân trang và privacy unlock token qua x-chat-unlock. Native phải hủy long-poll khi background, phục hồi unread/cursor và không ghi nội dung nhạy cảm vào log.
- Tài liệu xác nhận kiến trúc: moc_maria_fe/docs/CHAT_PERFORMANCE_DIGEST.md.
- acutis_education_chat là Express/Socket.IO/MongoDB service dùng chung; trong src/main.ts namespace /moc-maria-updates chỉ phát revision catalog từ website. Không chuyển customer–KTV messages sang database Mongo.

## Queue dùng chung

- acutis_education_queue: Express + BullMQ + Redis. src/jobs/catalog.ts liệt kê default ping/demo và email.send, email.assignment, email.kyc; queue notifications tồn tại trong tên queue nhưng không có handler hiện hành.
- BE tích hợp Queue server-to-server qua QUEUE_SERVICE_URL/QUEUE_API_KEY tại src/modules/admin-alerts, admin-intake, gift-events, zalo-alerts/chat-digest.
- App mobile không bao giờ gọi Queue /jobs hoặc nhúng queue API key; push notification chỉ là **backlog** cho đến khi có contract và worker thật.

## Ma trận rủi ro

| ID | Mức | Rủi ro | Hướng xử lý |
| --- | --- | --- | --- |
| R01 | P0 | Refresh cookie + origin không chắc tương thích native | Thiết kế phiên mobile được BE hỗ trợ, giữ rotate/revoke và không phá auth web |
| R02 | P0 | FE booking gọi các route BE checkout không có | Chốt một flow hợp lệ (inquiry hoặc booking đã kiểm chứng) |
| R03 | P0 | Directory phụ thuộc Next BFF, demo + alias | Chốt contract danh sách approved, khả năng chat và khả năng nhận lịch |
| R04 | P1 | Chat long-poll, unlock và retry | Abort/cleanup, secure memory, dedup, quy tắc background |
| R05 | P1 | RBAC nhiều vai trò; cập nhật KTV có version | Chặn đúng quyền, xử lý 401/403/409/stale |
| R06 | P1 | Quà/QR/voucher giới hạn, hết hạn | Xác thực hoàn toàn server-side, không dùng cache riêng |
| R07 | P2 | Push chưa có pipeline thật | Bổ sung backend+queue theo tài liệu, không giả định tồn tại |
| R08 | P2 | Catalog revision socket là public-only | Reconnect + foreground refetch; không coi là nguồn dữ liệu chính |

## Những gì audit chưa xác nhận

- Không đọc giá trị .env, token, dữ liệu khách hay DB live.
- Không đối chiếu Deployment image đang chạy với HEAD local; không kiểm tra health trên production.
- Không chạy npm test/lint/build hoặc migration. Đây là **audit tĩnh**, không phải quality gate runtime.
- Swagger chỉ được BE bật nếu SWAGGER_ENABLED; cần xác minh contract trên staging hoặc môi trường đọc-only khi triển khai P0.

## File bằng chứng chính

- FE: src/features/auth/context/AuthProvider.tsx, src/features/auth/auth-api.ts, src/features/mobile/data.ts, booking.tsx, appointment-request.tsx, appointments.tsx, chat.tsx, useCatalogRealtime.ts, src/app/api/mobile/.
- BE: src/modules/auth/auth.controller.ts, auth.service.ts, src/bootstrap/configure-application.ts, src/modules/bookings/bookings.controller.ts, src/modules/customer-experience/experience.controller.ts, src/modules/ktv-chat/ktv-chat.controller.ts, src/modules/gift-events/gift-wallet.controller.ts.
- Chat: src/main.ts, src/http/app.ts, src/socket/index.ts.
- Queue: src/jobs/catalog.ts, src/http/app.ts, src/workers/index.ts.
