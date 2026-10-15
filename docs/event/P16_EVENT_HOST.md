# P16 – Event subdomain host routing / readiness

## Trạng thái

Theo tracker Plan/14_ACTIVE_WORK.json, một tác vụ DNS/Vercel độc lập đã cấu hình Cloudflare CNAME event.mocmaria.com, gắn subdomain vào Vercel project FE hiện tại và quan sát HTTPS hợp lệ ngày 15/10/2026. P16 **không thay đổi DNS, Vercel domain ownership, secrets hay tài nguyên production**.

Trong source FE, Next config mới có một host-specific rewrite: chỉ đường dẫn gốc / của host event.mocmaria.com mới chuyển nội bộ tới /event. Các URL khác (/event, /dang-nhap, /api/release, static assets) và root mocmaria.com không thay đổi.

## Trước khi dùng event.mocmaria.com với tài khoản thực

1. Vercel production FE phải build commit P16 và host phải trả landing trên GET https://event.mocmaria.com/.
2. Backend biến môi trường CORS_ORIGINS phải cho phép **cả hai origin** https://mocmaria.com và https://event.mocmaria.com, không xóa host cũ. Chỉ người quản lý release đổi biến này sau khi test staging, không đưa khóa bí mật vào Git.
3. Kiểm tra HTTPS GET https://event.mocmaria.com/api/release, static images, GET /api/v1/gift-events/current. CORS preflight từ event host tới api.mocmaria.com phải hợp lệ cả Authorization và credentials.
4. Thử đăng nhập, refresh access token bằng cookie API, đăng xuất, returnTo=/event trên Chrome/Safari iOS/Android, normal/private mode. Cookie Auth tại API là HttpOnly, SameSite=lax: dùng test thật, không đoán hoạt động cross-origin.
5. Test trong môi trường staging/môi trường có migration QA trước; không bật phát quà thật chỉ vì FE và subdomain đã hoạt động.

## An toàn rollback

- Hoàn tác duy nhất commit rewrite P16 hoặc loại bỏ host rule trong next.config.ts (không cần xóa DNS) sẽ trả sự kiện về /event và host root về trang chủ bình thường.
- Feature flag GIFT_EVENTS_ENABLED=false luôn khóa thao tác thực tế phía server. Không sửa các API đặt lịch hiện hữu.
- Release owner lưu trước/sau commit SHA và chạy GET /, /event, /dang-nhap, /api/release trên **cả** mocmaria.com và event.mocmaria.com.

Các bài test automated chỉ chứng nhận Next config; không chứng nhận DNS, SSL, cookie, CORS sau deploy. Chúng phải được kiểm tra bằng browser và HTTP smoke ở production riêng.
