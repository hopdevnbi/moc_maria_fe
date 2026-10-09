# Dữ liệu dịch vụ massage minh họa – Mộc Maria

**Phạm vi**: bộ 10 dịch vụ với 20 biến thể thời lượng/giá, 10 ảnh WebP, liên kết sang 10 hồ sơ KTV minh họa.

### Cách tái tạo

1. `npm run demo:generate`: tạo lại hồ sơ KTV demo và liên kết thêm các dịch vụ mẫu.
2. `npm run demo:services:generate`: tạo 10 ảnh WebP tại `public/demo/services`, ghi `src/features/mobile/demo-services.json`.
3. `npm run demo:seed`: cập nhật metadata KTV demo, không ghi bảng duyệt KTV thật.
4. `npm run demo:services:seed`: upsert đúng một key `mocmaria.demo.services.v1` trong `app_metadata`. Script có dry-run khi gọi trực tiếp không kèm `--apply`.

Tất cả thao tác seed được thiết kế **idempotent**, giữ nguyên các bảng `services`, `service_variants`, `provider_applications`, `users`, `bookings`. API booking/chat không chấp nhận ID giả `demo-*`. Danh sách demo trên frontend được đánh dấu rõ ràng, không quảng cáo là bảng giá hoặc đội ngũ thật.

### Ảnh & cache

Ảnh minh họa được tạo tự động bằng SVG gốc rồi chuyển sang WebP, tải từ `/demo/services/` qua Vercel với `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.

Nếu Bunny Storage được cấp khóa qua **biến môi trường an toàn** (không ghi khóa vào Git / console), chạy lại `npm run demo:services:generate`; script sẽ upload đến thư mục `moc-maria/demo-services/2026-10/` và đổi URL trong JSON. Kiểm tra CDN trả 200 trước khi commit JSON sử dụng Bunny.

Không trộn dữ liệu demo vào catalog thật khi admin bắt đầu tạo dịch vụ thương mại. Khi đủ dữ liệu thật, có thể tắt việc import demo ở trang `/dich-vu` và trang chủ mà không cần xóa tài khoản hay booking.
