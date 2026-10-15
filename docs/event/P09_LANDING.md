# P09 · Landing page Event Mộc Maria

**Chặng 10/18 – sản phẩm giao diện nghiệm thu, chưa kích hoạt phát thưởng thật.**

Đường dẫn xem thử khi frontend đã deploy: **/event** trên domain ứng dụng Mộc Maria hiện tại. Subdomain event.mocmaria.com là chặng vận hành riêng sau này; P09 không tự thay DNS hoặc môi trường.

## Đã có

- Giao diện responsive mobile 320/360/390px và desktop 1440px theo concept P02.
- Sáu hộp quà ảnh WebP độc lập của P03, chọn hộp (aria-pressed) và trạng thái chọn rõ ràng; hỗ trợ keyboard và reduced-motion.
- Trang công khai đọc GET /gift-events/current: hiển thị DISABLED/NONE/SCHEDULED/LIVE/PAUSED/ENDED với thời gian server và countdown.
- Nếu đăng nhập, GET /gift-events/me kiểm tra lượt và hạng chính xác; liên kết đăng nhập giữ returnTo về /event.
- Thể lệ từ DB, chọn đồng ý phiên bản (chưa gửi mở), điều kiện VIP và giờ Việt Nam.
- Ví cá nhân GET /gift-events/me/rewards có trạng thái, hạn, địa điểm hợp lệ theo snapshot. Không phơi token QR trên URL/cached HTML.
- Trạng thái API lỗi, không có chương trình, chưa đủ điều kiện, đã chơi, tạm dừng, hết quà – tất cả đều có giải thích, không tạo giải giả.

## Ranh giới nghiệm thu

**P09 không gửi POST mở quà.** Nút mở quà vẫn khóa dù đủ điều kiện; chọn hộp chỉ là thao tác hiển thị. P10 (chặng 11/18) sẽ nối mutation an toàn + hiệu ứng sau khi server trả kết quả. Xuất/đổi QR tại quầy là chặng sau, không sử dụng ảnh UI thay cho quyền lợi.

Frontend chỉ cần biến môi trường API đang được app dùng; backend GIFT_EVENTS_ENABLED mặc định OFF. Khi backend chưa có migration hoặc chưa bật, landing không tạo quà, không phá các route đặt lịch. Không có kết quả giả lập nào được coi là quà thật.

Kiểm thử: npm run typecheck; npx vitest run src/features/gift-events/gift-event-landing.test.tsx; npm run build.
