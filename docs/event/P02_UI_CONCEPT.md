# P02 · Khu vườn quà An Nhiên — UI concept

**Tình trạng:** Prototype thiết kế, KHÔNG trao thưởng và KHÔNG lấy dữ liệu production.
**Bản mẫu:** [P02_preview.html](./P02_preview.html) — mở trực tiếp bằng trình duyệt, chọn các tab trạng thái, dùng DevTools kiểm tra 390px và 1440px.
**Thiết kế chính thức cho P09:** route `/event` trong ứng dụng Next.js hiện có; subdomain `event.mocmaria.com` ở P16.

## Nhận diện và tính cách

Khái niệm **Khu vườn quà An Nhiên**: khoảnh khắc mở một món quà được chăm chút như buổi trị liệu. Nhẹ nhàng, có chiều sâu, không giống sòng bạc hay game gacha. Kết quả của mỗi hộp do máy chủ quyết định, hộp chỉ khác sắc thái trang trí.

| Thành phần | Định nghĩa |
|---|---|
| Nền chính | Ivory `#f8f7f0`, warm white `#fffdf8` |
| Forest | `#153f32`, hover `#235545` |
| Sage | `#dfe9df`, dusty sage `#89a38d` |
| Champagne | `#d6ae68`, metallic light `#f0d99e` |
| Peach | `#f6e3d5`, highlight `#c77b61` |
| Typography | Headings **Georgia** (serif có dấu tiếng Việt), body **system-ui / Arial**, fallback rõ dấu; production kiểm tra font đã được license |
| Grid | 12 cột desktop 1440px; 4 cột mobile 390px; max content 1120px |
| Spacing | 4/8/12/16/24/32/48/64px; button 48px+, mobile tap 44px+ |
| Radius | 12px controls, 20px cards, 28px hero/panel |
| Motion | focus 200ms → open lid 650ms → glow reveal 500ms; reduced-motion instant; âm thanh OFF |

## Wireframe desktop 1440

```
┌──────────────────────────────────────────────────────────────────────┐
│ Mộc Maria                          Thể lệ | Ví quà | Đăng nhập       │
├───────────────────────┬──────────────────────────────────────────────┤
│ EV 2026 / LỜI TRI ÂN  │          VƯỜN HỘP QUÀ                        │
│ MỞ HỘP QUÀ           │   ☐    ☐    ☐     (3 cột x 2 hàng)         │
│ NHẬN YÊU THƯƠNG      │   ☐    ☐    ☐                               │
│ CTA + timer          │          trạng thái tài khoản                │
├───────────────────────┴──────────────────────────────────────────────┤
│ Thể lệ tóm tắt | Những phần quà | FAQ | Footer                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Wireframe mobile 390

```
┌────────────────────────────┐
│ LOGO         ☰ / Ví quà    │
├────────────────────────────┤
│ Nhãn trạng thái            │
│ MỞ HỘP QUÀ                │
│ NHẬN YÊU THƯƠNG            │
│ CTA + đồng hồ             │
│                         │
│      Hộp 1      Hộp 2    │
│      Hộp 3      Hộp 4    │
│      Hộp 5      Hộp 6    │
├────────────────────────────┤
│ Thể lệ / FAQ / Footer     │
└────────────────────────────┘
```

## Các trạng thái bắt buộc

1. **SCHEDULED:** hiển thị countdown từ serverNow, hộp trang trí không bấm mở, CTA “Xem thể lệ”.
2. **LIVE + ELIGIBLE:** chỉ hạng hợp lệ, còn 1 lượt: chọn 1 trong 6 hộp, bảng quà có thể nhận, CTA “Mở hộp quà”.
3. **OPENING:** khóa double tap, loading, animation theo kết quả đã ghi server; cung cấp “Bỏ qua hiệu ứng”.
4. **REVEAL:** hiển thị snapshot tên/loại/quyền lợi/hạn/điều kiện và CTA “Xem ví quà”; không chọn kết quả ở FE.
5. **ALREADY_PLAYED:** thay CTA bằng “Xem quà của tôi”; 6 hộp còn trang trí nhưng không cho mở.
6. **INELIGIBLE_TIER:** nói rõ hạng khách hiện tại và danh sách hạng chấp nhận (đối chiếu server).
7. **WALLET:** nhóm ISSUED / REDEEMED / EXPIRED, các điều kiện chi nhánh/hạn và thông báo QR.
8. **PAUSED/ENDED/OUT_OF_STOCK/ERROR:** giải thích ngắn gọn, không chạy màn trúng; lượt được giữ nguyên nếu request chưa commit.

## Ưu tiên trải nghiệm

- Animation chỉ chạy sau POST open thành công; visual prototype P02/P03 không có mutation và dán nhãn **MÔ PHỎNG**.
- Kết quả đọc được bằng `aria-live`; `prefers-reduced-motion` giảm chuyển động; không autoplay âm thanh.
- Tối ưu media qua SVG/WebP/AVIF, tránh tải ảnh 6 hộp desktop nguyên cỡ lên mobile.
- Form trạng thái: CTA rõ, keyboard focus, tương phản, skeleton khi chờ API, không fake VIP.
- Giao diện mobile có thể cuộn theo một cột; không có overflow 320/360/390px.
- Admin design system cùng palette nhưng ưu tiên bảng dữ liệu/khả năng lọc và màn xác nhận thay đổi tiền/quỹ.

## Gate chấp nhận P02

- [x] Có bố cục xem được desktop/mobile ở cùng tài liệu HTML.
- [x] Có mẫu UI đủ các trạng thái chờ/live/opening/reveal/exhausted/ineligible/wallet.
- [x] Định nghĩa token và nhịp motion, reduced-motion, text tiếng Việt.
- [x] Tất cả phần quà trong bản preview ghi **MÔ PHỎNG**, không phải kết quả thực.
- [ ] UX trong browser mobile thật sẽ được xác minh trong P15 trước phát hành.

**Phạm vi commit P02:** chỉ `docs/event/P02_UI_CONCEPT.md` và `docs/event/P02_preview.html`. Không sửa trang chủ/prod/DNS.
