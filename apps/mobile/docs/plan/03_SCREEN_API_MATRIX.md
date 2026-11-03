# 03 — Màn hình React Native ↔ API hiện tại

**Quy ước:**
- **FOUND**: đã đọc được controller hoặc Next route trong checkout local; chưa xác nhận live.
- **BFF**: chỉ thấy route tổng hợp ở Next.js, cần chọn cách dùng native.
- **GAP**: FE gọi nhưng chưa thấy controller tương ứng ở BE checkout.
- **VERIFY**: có nguồn cần xác nhận response, role, trạng thái thực hoặc UX.
- Tất cả đường dẫn BE dưới prefix **https://api.mocmaria.com/api/v1**; đường dẫn Next **https://mocmaria.com**.

## Customer/public screens

| Màn hình | Dữ liệu / hành động | Endpoint quan sát | Mức | Native cần làm |
| --- | --- | --- | --- | --- |
| Splash / welcome | Logo, branding, session check | POST /auth/refresh; GET /auth/me | P0 | Auth bootstrap an toàn, không flash dữ liệu private |
| Home + KTV discovery | KTV đã duyệt, ảnh, dịch vụ, tìm kiếm | GET /providers; GET /ktv-chat/providers; GET /provider-display; GET /api/mobile/directory (Next) | FOUND/BFF/VERIFY | Thống nhất alias, demo policy, hide profile không phục vụ |
| KTV detail | Bio, avatar, khả năng phục vụ | GET /providers/:id; GET /provider-presentation/profiles | FOUND/VERIFY | Xử lý id publicAlias/UUID, consent ảnh |
| Danh sách dịch vụ | Danh mục, biến thể, giá | GET /services; GET /service-categories | FOUND | Giá là server-owned, không hardcode |
| Chi tiết dịch vụ | Giá, thời lượng, KTV hợp lệ | GET /services/:slug; GET /api/mobile/service/:slug (Next) | FOUND/BFF | Kiểm tra unavailable/disable |
| Chi nhánh | Cơ sở, địa chỉ, giờ | GET /branches; GET /branches/:id/hours | FOUND | Map deep link, không suy luận GPS |
| Kiểm tra slot | Ngày, KTV, dịch vụ, giờ | GET /availability; GET /api/mobile/availability (Next) | FOUND/BFF | Không cache shared, timezone VN |
| Đặt lịch chính thức | Slot request + báo giá | POST /bookings/requests | **GAP P0** | Chỉ dùng khi đã có controller/contract thực |
| Yêu cầu tư vấn/đặt hẹn | Gửi yêu cầu theo KTV, dịch vụ, địa chỉ, giờ | POST /appointment-inquiries | FOUND | UUID idempotency, trình bày chưa xác nhận |
| Lịch/yêu cầu của tôi | Danh sách đặt lịch, trạng thái | GET /bookings/me **GAP**; GET /appointment-inquiries FOUND | GAP/FOUND | Chốt nguồn dữ liệu + nhãn chính xác |
| Chấp nhận báo giá | Đồng ý giá/revision | POST /bookings/:id/confirm-quote | **GAP P0** | Không đưa vào MVP nếu BE chưa có |
| Login / Register | Session người dùng | POST /auth/login; POST /auth/register; GET /auth/me | FOUND | Token và quyền; phương án refresh P0 |
| Quên / đổi mật khẩu | Forgot/reset/change | POST /auth/forgot-password, /auth/reset-password, /auth/change-password | FOUND | Link reset từ mail/deep link kiểm chứng |
| Tài khoản | Đọc/sửa profile khách | GET/PATCH /customers/me | FOUND | Avatar và quyền riêng tư |
| Avatar khách | Upload | POST /customers/me/avatar | FOUND | multipart file, 5 MB, quyền camera/photos |
| Chat inbox | Threads/unread count | GET /ktv-chat/threads | FOUND | Đồng bộ theo user, clear cache logout |
| Chat detail | History + send + read | GET/POST /ktv-chat/threads/:id/messages; GET :id/updates; POST :id/read | FOUND | Pagination, long-poll, idempotent retry |
| Chat ảnh | Upload, gửi ảnh | POST /ktv-chat/threads/:id/images | FOUND | MIME+size, progress/timeout |
| Chat privacy | Lock/unlock/password/block | /ktv-chat/threads/:id/privacy/*; POST :id/block|unblock | FOUND | Unlock token memory, không persist |
| Hội viên | VIP info/profile | GET /customers/me; các field từ response thật | VERIFY | Không tự sinh quyền/voucher/điểm |
| Sự kiện mở quà | Sự kiện và quyền mở | GET /gift-events/current; GET /gift-events/me; POST /gift-events/:id/open | FOUND | Server quyết định suất, rate limit, chống double tap |
| Ví quà và voucher | Nhận/hiển thị mã, QR | GET /gift-events/me/rewards; GET :id; POST :id/qr; POST :id/code | FOUND | Không dùng QR hết hạn hoặc lưu ảnh mã dài hạn |

## KTV / staff screens

| Màn hình | API quan sát | Mức | Native cần làm |
| --- | --- | --- | --- |
| KTV dashboard | GET /appointment-inquiries; GET /provider/inquiry-fulfillments | FOUND/VERIFY | Chỉ dữ liệu được phân công; trạng thái theo BE |
| Tiếp nhận/từ chối | PATCH /appointment-inquiries/:id | FOUND | Cần reason & kiểm tra quyền, stale |
| Bắt đầu / hoàn thành phục vụ | POST /provider/appointment-inquiries/:id/start; POST :id/complete | FOUND | Confirmation bắt buộc, không xác nhận trước thời gian |
| Chỉnh tiến độ | PATCH /provider/inquiry-fulfillments/:id/status | FOUND | Version và conflict handling |
| Hồ sơ staff | GET/PATCH /staff/me; POST /staff/me/avatar | FOUND | Role staff.portal, ảnh được cấp quyền |
| Đăng ký KTV | POST /provider-applications; GET/PATCH /provider-applications/me | FOUND | Chỉ sau khi xác minh quy trình onboarding |
| KTV lịch/đào tạo | /provider-applications/me/planning, training*, training-sessions | FOUND/VERIFY | Phase sau, theo permission thực |
| An toàn KTV | GET/POST /ktv-safety, /me, /:id/point, /:id/action, /:id/incident | FOUND | Xác thực quyền, vị trí và privacy nếu có |
| Tác vụ quầy đổi voucher | /staff/gift-redemptions/* | FOUND | Chỉ người được cấp quyền; QR scanner native sau MVP |

## Admin và hệ thống

- Admin dashboard, quản lý KTV/chi nhánh/dịch vụ, user roles, khách hàng, sự kiện, báo cáo, Zalo: **giữ trên web trong MVP**; không đưa secret hoặc quyền quản trị vào app công khai nếu không có quyết định riêng.
- Realtime catalog: namespace **/moc-maria-updates**, event **moc-maria:catalog-changed**, chỉ nhận revision; sau đó refetch REST; có fallback khi foreground.
- Queue /jobs: **server-to-server ONLY**, không có mobile endpoint.
- Push notifications: **chưa có mobile device-token + worker contract được xác nhận**; không tick là FOUND.

## Các hợp đồng bắt buộc trước code

1. Native session: POST login/register, refresh, logout, logout-all, /auth/me; scope và vòng đời token.
2. Directory: ID public vs provider application ID vs chat provider ID; isDemo/chatEnabled/scheduleOpen, consent và role.
3. Booking: chọn **inquiry** hay **slot/quote booking** làm sản phẩm MVP; gắn API/state machine và lỗi chính xác.
4. Messages: clientMessageId, after cursor, before pagination, x-chat-unlock, ảnh upload, 401/403/404.
5. Wallet: redeem QR lifetime và tiêu chí đã dùng; chỉ BE quyết định kết quả.
6. Provider fulfillment: allowed transitions, optimistic version, lý do bắt buộc, audit.

Nguồn: FE src/features/mobile và src/app/api/mobile; BE src/modules/*/*.controller.ts và DTO tương ứng.
