# 02 — Kiến trúc ứng dụng React Native

## Mục tiêu kiến trúc

Xây **một ứng dụng native riêng** cho Android/iOS, giữ nguyên Next.js web, NestJS API, Postgres, Chat và Queue hiện tại. Mobile là một client API, không có backend riêng hoặc database nghiệp vụ riêng.

### Sơ đồ luồng

- React Native iOS/Android → HTTPS → api.mocmaria.com/api/v1 → NestJS → PostgreSQL.
- React Native → HTTPS → endpoint tổng hợp công khai của web *nếu cần tương đồng directory*, nhưng ưu tiên DTO backend ổn định.
- React Native → GET/POST /ktv-chat/threads… của BE để chat khách–KTV; long-poll lấy tin mới.
- React Native → Socket.IO chat.giangxa.com/moc-maria-updates **chỉ tùy chọn để báo thay đổi catalog công khai**; luôn refetch API.
- NestJS → internal acutis_education_queue → BullMQ/Redis để xử lý email/outbox; mobile không gọi queue.
- MongoDB của Acutis Chat không dùng để lưu tin nhắn khách–KTV Mộc Maria.

## Stack đề xuất

| Lớp | Đề xuất | Lý do |
| --- | --- | --- |
| Runtime | Expo + React Native + TypeScript | Phát triển trên Windows, build Android/iOS qua EAS |
| Navigation | Expo Router | Deep link + tabs + nested route |
| REST | fetch wrapper typed hoặc Axios | Base URL, timeout, retry, x-request-id, auth interceptor |
| Cache | TanStack Query | Đồng bộ dữ liệu HTTP, invalidate, retry có chọn lọc |
| Local state | Zustand | UI state không nhạy cảm |
| Form | React Hook Form + Zod | Schema và lỗi form |
| Token | expo-secure-store | Lưu session bí mật trên thiết bị |
| Media | expo-image, expo-image-picker | Hiển thị/chọn ảnh theo quyền |
| QR | expo-camera theo luồng được chốt | Scanner voucher và permission |
| Lifecycle | AppState, NetInfo | Refresh khi foreground, xử lý mất mạng |
| Notifications | expo-notifications ở phase riêng | Chỉ sau khi BE có endpoint/pipeline push |
| CI/CD | GitHub Actions + EAS Build/Submit | Tách vòng đời app khỏi Vercel/Kubernetes |

**Không** chia sẻ các component Next DOM/CSS hoặc server-only code. Tái sử dụng types, formatting, quy tắc thuần, enum/schemas đã kiểm thử qua shared package **sau này nếu có nhu cầu**; tránh gắn native build vào repo FE.

## Cấu trúc repo dự kiến khi được phép code

**Quyết định mới 03/11/2026:** dùng cùng repository Git với FE, tạo nhánh **main-mobile** và worktree riêng, app tại **apps/mobile/**. Không tạo repository mới, không chỉnh sửa website `main`.

- app/ — routes/tabs của Expo Router.
- src/features/auth, discovery, booking, inquiries, chat, profile, gifts, provider-workspace.
- src/api/ — client, endpoints, DTO, interceptors, error model.
- src/components/ — design system native, forms, loading, empty/error.
- src/hooks/ — app state, polling, network, permissions.
- src/store/ — session UI và các state không nhạy cảm.
- src/config/ — môi trường build, URLs, flags; chỉ public settings.
- src/utils/ — currency VND, timezone Asia/Ho_Chi_Minh, deep links.
- __tests__/ và e2e/ — unit/integration/mobile flow.
- assets/ — logo, icon, splash được cấp quyền sử dụng, tối ưu kích thước.

## Phân ranh trách nhiệm

| Chủ sở hữu | Chịu trách nhiệm |
| --- | --- |
| App native | UI, navigation, hỗ trợ camera, cache, lỗi mạng, session storage, deep links |
| Mộc Maria BE | Auth/RBAC, dữ liệu thực, booking/inquiry, chat, quà, redeem, upload, validation |
| Next.js web | Website SEO + admin, có thể cung cấp public BFF directory trong giai đoạn chuyển tiếp |
| Acutis Chat | Realtime revision công khai, không thay DB chat Mộc Maria |
| Acutis Queue | Email jobs/outbox, retry phía server; push chỉ sau khi có design/API |

## Chiến lược API

1. Public REST trực tiếp: services, providers, branches, availability, public provider-display (đối chiếu response DTO).
2. Private REST: /auth, /customers/me, /appointment-inquiries, /ktv-chat/threads, /gift-events, provider/safety theo permission.
3. Phân biệt **request consultation** và **confirmed appointment**: không dùng chung DTO/label khi nghiệp vụ khác nhau.
4. Đối với directory web: nếu hiện phụ thuộc dữ liệu demo/presentation và BFF, chọn một DTO chuẩn đã kiểm chứng; không copy logic Next server-only và không dùng dữ liệu demo giả làm business record.
5. API request wrapper: HTTPS only trên production; response typed; thống nhất {message, status, details} theo thực tế; 401 thử refresh đúng một lần; 403 show denied; 409 conflict/stale; 429 retry có backoff theo chính sách; 5xx lỗi tạm thời.
6. TanStack Query tách key theo account ID và môi trường; clear private cache khi logout/switch user; không persist cache private vào AsyncStorage.
7. Idempotency key giữ nguyên khi retry cùng hành động submit, đổi mới khi người dùng sửa payload; không tự retry POST non-idempotent.

## Authentication — phải giải P0 trước screens private

Auth hiện tại trả accessToken trong JSON, refresh token xoay vòng nhưng **chỉ thiết kế cho HttpOnly browser cookie**. React Native không được mặc định fetch tự quản lý cookie tương đương browser; BE còn kiểm tra Origin.

Phương án đề xuất để đánh giá:
- **Ưu tiên:** thiết kế **mobile-scoped refresh session** trong BE (endpoint hoặc transport native chuyên biệt), có device/session binding hợp lý, rotate + revoke, rate limiting, audit, expires và backward compatibility; access token dùng chung JWT Bearer với website. Refresh secret lưu trong OS secure storage; không đặt trong AsyncStorage/log/URL.
- **Phương án đánh giá:** native cookie jar được hỗ trợ có kiểm thử iOS/Android, cùng Origin/CSRF policy chính thức; không fake Origin, không giảm bảo vệ CSRF trên web.
- Chọn một phương án bằng thử nghiệm dev/staging và security review trước triển khai; không viết cả hai tùy tiện.

## Điều kiện sẵn sàng

- P0 auth lifecycle test được trên Android và iOS.
- OpenAPI/DTO cho màn hình MVP được kiểm chứng với BE đang deploy hoặc bản staging đồng bộ.
- Các action private xử lý permission và trạng thái mạng đúng.
- Không có thay đổi phá website/BE; các thay đổi additive được phát hành BE trước mobile, có kế hoạch rollback.
