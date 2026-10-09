# Mộc Maria — 10 KTV minh họa

Các hồ sơ trong `src/features/mobile/demo-ktvs.json` chỉ là **dữ liệu giả lập** để thử giao diện. Trang chủ và trang chi tiết hiển thị nhãn minh họa; tuyệt đối không cho book hoặc chat với các ID `demo-ktv-*`.

- `npm run demo:generate`: tạo 10 avatar WebP khoảng 5–6 KB tại `public/demo/ktv` và cập nhật JSON. Mặc định sử dụng file cục bộ.
- `npm run demo:seed`: dùng môi trường backend ở thư mục anh em `moc_maria_be`, cập nhật idempotent key `mocmaria.demo.ktv.v1` trong bảng `app_metadata`. Không ghi vào `users`, `provider_applications`, chứng nhận hoặc bảng booking.
- Để đưa ảnh lên Bunny Storage, cấp **BUNNY_STORAGE_API_KEY** từ một biến môi trường an toàn trong máy đang chạy script, sau đó chạy `npm run demo:generate` rồi `npm run demo:seed`, commit JSON mới và deploy FE. Script chỉ tải ảnh lên `giangxa-media/moc-maria/demo-ktv/2026-10/` với Content-Type `image/webp`.

Không bao giờ ghi Bunny API key vào Git, `.env.example` hoặc kết quả console. Cần xác nhận HTTP 200 trên từng ảnh CDN và màn hình mobile trước khi kết luận bước upload hoàn tất.
