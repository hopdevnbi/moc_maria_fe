# 05 — Bảo mật và đặc thù React Native

## 1. Nguyên tắc bảo mật

- Mọi quyền quyết định tại backend: login, role/permission, KTV booking eligibility, vị trí và dịch vụ, quà, QR, giá, trạng thái đã phục vụ.
- Production chỉ HTTPS; không pin API key hoặc service secret vào bundle JS / EXPO_PUBLIC / assets.
- Không truy vấn DB hay gọi Redis, Mongo, internal Kubernetes services, Queue /jobs từ ứng dụng.
- Không lưu password, refresh token, x-chat-unlock hoặc nội dung chat nhạy cảm vào AsyncStorage hoặc analytics.
- Không lưu/cache private data theo URL dùng chung; clear private queries, uploads và màn hình sau logout hoặc đổi tài khoản.
- Server cần thực thi audit, throttling, revoke và idempotency; client chỉ hỗ trợ UX.

## 2. Native authentication — P0

**Trạng thái thật:** AuthController lấy refresh từ HttpOnly cookie moc_maria_refresh; middleware từ chối cookie auth request không có Origin. Web sử dụng credentials: include. Access token trả trong JSON.

**Không được:** dùng token web copy thủ công, dùng JWT secret trên app, fake Origin để qua bảo vệ, tắt CSRF/CORS toàn cục, hoặc giữ refresh token ở AsyncStorage.

**Phương án A (khuyến nghị để đánh giá):** BE bổ sung hình thức refresh native có version, access JWT như web, refresh opaque token gắn session/device, hash server-side, rotate atomically, chống reuse, logout/logout-all, auditing và rate limiting. App lưu secret trong expo-secure-store, chỉ đưa vào request HTTPS phù hợp; bảo đảm backend không làm lộ token trong log/exception.

**Phương án B (chỉ sau thử nghiệm):** native cookie jar tương thích cả Android/iOS, origin/CSRF policy chuẩn và xử lý cookie partition, SameSite, expired/resume chính xác. Không chọn trước khi có test end-to-end trên thiết bị thật.

**Trình tự auth client:** bootstrap → refresh an toàn (single-flight) → /auth/me/identity → set user roles → private query. Mọi 401 refresh tối đa một lần rồi logout sạch; 403 là thiếu quyền, không retry vô hạn; 429 có backoff và UI hữu ích; refresh token rotation phải không bị đua song song.

## 3. Network/caching/offline

- TanStack Query cho public GET với stale policy ngắn; dùng invalidate khi AppState active, pull-to-refresh, web catalog revision.
- Availability, booking quote, wallet/QR, profiles private, chat: không dùng shared cache và không persist offline. Nếu cần offline thì chỉ lưu danh mục public đã vệ sinh, có timestamp rõ và nút làm mới.
- POST gửi yêu cầu/đổi trạng thái: idempotency key/expectedVersion, khóa nút trong lúc request, không tự gửi lại nếu kết quả chưa biết; khi timeout kiểm tra trạng thái server trước.
- AppState background: abort long-poll, dừng camera/microphone/vị trí, ẩn dữ liệu nhạy cảm khi cần; foreground: refresh profile/threads.
- Timezone nghiệp vụ Asia/Ho_Chi_Minh, lưu/truyền timestamp ISO UTC theo hợp đồng BE, hiển thị local đúng GMT+7. Không convert chuỗi datetime hai lần.

## 4. Chat người dùng và KTV

- Gọi /ktv-chat/threads ở BE/Postgres; phân trang tin nhắn theo before; long-poll /updates?after=... chỉ khi app foreground và thread đang mở.
- Giữ clientMessageId để retry cùng tin; merge theo server message ID, dedup theo clientMessageId; không bỏ tin chưa sync khi đóng app.
- Privacy: x-chat-unlock token chỉ ở memory, không ghi SecureStore nếu chưa có chính sách rõ; tự lock khi rời màn/đưa app background hoặc theo điều kiện server; không show preview nhạy cảm khi khóa.
- Upload ảnh tối đa 5MB trước khi gửi; client resize/convert khi phù hợp, kiểm tra JPEG/PNG/WebP, server vẫn xác thực nội dung và quyền.
- Không dùng namespace Mongo chat như nguồn tin cá nhân; chỉ optional /moc-maria-updates cho revision.

## 5. Camera, Photos, QR, safety

- Camera/Media Library chỉ xin quyền **khi dùng** (avatar, gửi ảnh, quét voucher); từ chối quyền phải vẫn dùng được tính năng khác và mở Settings nếu cần.
- Voucher QR có TTL do server quản lý, không được dùng ảnh chụp hoặc QR đã hết hạn để chứng nhận đã sử dụng; server verify/redeem và ghi idempotent/audit.
- Không xin vị trí background mặc định. Nếu feature KTV safety cần vị trí, phải có mô tả mục đích, đồng ý riêng, trạng thái hoạt động và giới hạn lưu trữ; không liên tục thu location chỉ vì app mở.
- Dùng deep link dựa trên native scheme/universal links sau khi đã chốt domain association, có allowlist và validate query. Không nhúng token reset password vào analytics.
- Hình ảnh/logo thương hiệu chỉ dùng tài sản được chủ sở hữu cho phép; bảo đảm release build có icon/splash đúng.

## 6. Push notification (phase độc lập)

**Chưa sẵn sàng theo source:** Queue có tên notifications nhưng catalog handler rỗng; chưa xác nhận thiết bị push/token endpoint.

Thiết kế nếu triển khai:
1. Thiết bị xin quyền push sau khi người dùng thấy giá trị tính năng; lấy device push token.
2. BE thêm API register/revoke device token liên kết user, platform, environment, device ID ngẫu nhiên; cập nhật khi refresh/logout.
3. Event types rõ ràng: yêu cầu mới, KTV phản hồi, tin nhắn mới (không gửi message body riêng tư nếu chính sách cấm), nhắc giờ hẹn, voucher.
4. Queue worker/server-side push provider với retry, idempotency, TTL, invalid token cleanup, opt-out; không đính service API key trong mobile.
5. Kiểm thử permission denied, uninstall, token rotation, nhiều thiết bị, logout, không phát chéo user/tenant.

Không đặt push là điều kiện blocking cho MVP nếu scope không yêu cầu.

## 7. Tuân thủ và dữ liệu

- Có Privacy Policy, Terms, quy trình yêu cầu xóa tài khoản/dữ liệu hoặc giải thích lưu trữ theo chính sách thực tế trước public store.
- Analytics/log không chứa PII, địa chỉ, nội dung chat, password, token, voucher code, secret.
- Dữ liệu camera/vị trí/notifications theo khai báo App Store / Play Console đúng những tính năng thực sự dùng.
- KTV safety/incident có dữ liệu nhạy cảm: quyền kiểm soát truy cập, không hiển thị trong notifications lock screen tùy tiện.
