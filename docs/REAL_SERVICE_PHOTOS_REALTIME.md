# Mộc Maria: ảnh dịch vụ thực tế & đồng bộ catalog

## Ảnh
- 35 ảnh gốc do chủ dự án đặt tại thư mục Desktop "Ảnh Mocmaria"; ảnh gốc giữ nguyên.
- 10 ảnh đại diện được crop bằng Sharp (attention) tỷ lệ 12:7 và xoá metadata EXIF.
- Mỗi dịch vụ có WebP 480×280 và 960×560, ưu tiên 480px cho mobile thông qua HTML picture/srcset; fallback trực tiếp vào ảnh CDN 960px.
- 20 ảnh đã tải vào Bunny Storage zone giangxa-media theo prefix `moc-maria/services/photos-v1/`.
- File name gắn SHA256 (12 ký tự) để cache an toàn khi thay ảnh; Bunny pull zone hiện trả `Cache-Control: public, max-age=2592000` (30 ngày). Fallback local có cache immutable.
- Tổng dung lượng 20 ảnh: ~420 KB; ảnh được lười tải ở thẻ dịch vụ, ảnh trên trang chi tiết được ưu tiên.

Mapping mã nguồn ảnh (tiền tố filename) → dịch vụ:

| Dịch vụ | Ảnh nguồn (tiền tố) |
| --- | --- |
| massage thư giãn | 509439388 |
| massage đá nóng | 536275033 |
| massage cổ vai gáy | 553130422 |
| massage chân | 528621802 |
| massage thảo dược | 539930215 |
| massage bấm huyệt | 526185038 |
| massage tinh dầu | 545702234 |
| massage Thái thư giãn | 510803302 |
| chăm sóc lưng | 509442291 |
| gội đầu dưỡng sinh | 552722889 |

Một số ảnh được chụp khi đang massage chung, không nhất thiết cho thấy đúng kỹ thuật cụ thể như đá nóng/thảo dược. Do file nguồn có trùng nội dung, ảnh massage chân và đá nóng hiện cùng một góc chụp. Có thể thay sau mà không phá cache cũ nhờ tên file theo hash.

### Thay ảnh lần sau
1. Đảm bảo tên service demo đúng mã id trong `scripts/import-real-service-photos.mjs`.
2. Đặt `MOC_MARIA_PHOTOS_DIR` và `BUNNY_STORAGE_API_KEY` trong môi trường cá nhân an toàn (không commit/dán vào shell history).
3. Chạy `node scripts/import-real-service-photos.mjs --upload`.
4. Kiểm tra HTTP 200 và Cache-Control cho cả 20 URL trước khi đưa manifest mới vào Git.

## Realtime catalog

Luồng dữ liệu KTV và dịch vụ thật: BE public /providers, /services, /branches → revision public endpoint FE `/api/mobile/public-revision` (no-store) → Chat Socket.IO namespace `/moc-maria-updates` polling tối đa mỗi 5 giây khi có client → sự kiện `moc-maria:catalog-changed` chỉ chứa revision, không chứa PII → FE `router.refresh()` và lấy lại dữ liệu thật.

- Client có polling fallback 90 giây và kiểm tra lại khi tab hiện để tránh mất sự kiện.
- Catalog server fetch không cache, nhằm làm mới sau khi nhận sự kiện; ảnh CDN vẫn cache dài hạn.
- Dữ liệu demo là snapshot build-time để trình diễn, không phải danh mục thương mại trong DB; thay đổi metadata demo cần deploy FE tương ứng.
- Khi Chat namespace chưa deploy, fallback 90 giây vẫn đảm bảo khách thấy dữ liệu thật mới.
- Không cache nội dung đơn đặt lịch, báo giá, tin nhắn hoặc người dùng.
