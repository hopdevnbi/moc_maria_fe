# P03 · Original gift box assets & motion study

**Chặng 04/18.** Mục tiêu: thư viện đồng bộ 6 hộp quà và hiệu ứng 3 pha độc lập hoàn toàn với kết quả phát thưởng. **Không deploy event thực; không random quà trên frontend.**

## Tài nguyên

- Bộ 6 thiết kế SVG gốc tự vẽ bằng vector, mỗi hộp cùng khung/kích thước và chỉ khác sắc độ botanical/champagne/ivory/sage/peach; không dùng ảnh có bản quyền từ website khác.
- Mỗi hộp có 1 SVG vector, 1 WebP 320px, 1 WebP 640px. Manifest: `public/event/gift-boxes/manifest.json`. WebP không chứa kết quả trúng quà.
- Script tái tạo: `node scripts/event-assets/generate-gift-boxes.cjs` với Sharp (chỉ chạy lúc build asset/dev; không cần server xử lý ảnh theo từng lượt).
- Frontend P09 dùng `picture` hoặc `next/image` có `sizes` thích hợp, lazy-load ở ngoài fold và preload 1 ảnh hero nếu cần. Dùng SVG fallback khi WebP tải lỗi.

## Prototype

Mở [P03_motion_preview.html](./P03_motion_preview.html) trên Chrome/Edge, dùng Device Mode 390px hoặc 1440px.

1. **Focus (200ms):** hộp được chọn nhấc nhẹ lên, nền dịu dần.
2. **Lid-open (650ms):** nắp tách khỏi thân hộp và dải ribbon lung linh.
3. **Reveal (500ms):** màn hình kết quả mẫu có nhãn **MÔ PHỎNG** và nút đóng.

Có **Bỏ qua hiệu ứng** và CSS `prefers-reduced-motion: reduce` đưa thẳng kết quả, không autoplay âm thanh. Prototype dùng `setTimeout` để mô phỏng khoảng chờ, **không có API phát quà, không chọn quà ngẫu nhiên**, không phát voucher/QR thực.

## Kiểm tra đã dự kiến

- So sánh dung lượng WebP với SVG và không vượt mức tải cho mobile; 320px dùng card, 640px cho hero/lightbox.
- Xem tỉ lệ 390px/1440px; phát âm thanh OFF; keyboard tab/focus visible, nút Skip; aria-live thông báo trạng thái.
- Nếu hình không tải → hình thay thế vector/CSS được mô tả để triển khai trong P09; không block button thao tác.
- Đối với P10, **phải chờ server xác nhận** trước khi chạy hoạt ảnh; không “trúng” khi API thất bại.
