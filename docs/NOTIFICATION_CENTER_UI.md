# Trung tâm thông báo — 14/10/2026

## Thay đổi

Trang `/quan-tri/thong-bao` dùng feature riêng `src/features/notifications`, có tổng quan Zalo/email/trạng thái gửi, chọn lịch theo ngày hoặc khoảng giờ, tóm tắt lịch và danh sách người nhận. `/quan-tri/zalo` cùng kiểu giao diện, hướng dẫn kết nối thu gọn khi đã kết nối, sao chép mã, kiểm tra gửi tin và danh sách 10 thông báo gần đây.

Các checkbox cũ chịu kiểu dáng của ô nhập liệu, bị giãn cao/rộng. Công tắc mới có kiểu riêng và vùng chạm 44×44, hỗ trợ bàn phím, focus và screen reader. CSS giới hạn trong feature thông báo; không sửa stylesheet quản trị chung hay module đặt lịch.

## Hành vi

- Nạp đúng chế độ lịch đang lưu. Chỉ hiện phần giờ phù hợp. Có mốc nhanh 1/6/12/24 giờ và nhập tùy chỉnh 1–168 giờ.
- Bản nháp và tóm tắt cập nhật cùng nhau; bấm Làm mới trạng thái không ghi đè bản nháp. Lần báo theo lịch đã lưu dùng timestamp từ API và giờ Việt Nam. Nút lưu chỉ bật khi có thay đổi hợp lệ.
- Đổi về lịch ngày hoặc tắt báo cáo không gửi dữ liệu khoảng giờ ẩn không hợp lệ. Payload vẫn có đủ các field hiện tại của API.
- Email được chuẩn hóa, không thêm trùng địa chỉ đang bật; có thể bật lại email đã tạm ngưng. Công tắc bật/tắt từng người nhận và xác nhận xóa ngay trong thẻ.
- Bot có phản hồi thao tác tại đúng thẻ, sao chép mã với hướng dẫn khi clipboard không sẵn sàng. Kiểm tra gửi tin và chạy báo cáo thực tế giữ nguyên endpoint, quyền và điều kiện gửi.
- Loading/error/empty trạng thái riêng; không hiển thị dữ liệu giả trên production.

## Kiểm chứng

Format/lint/typecheck,139 tests và production build PASS trước tích hợp main cập nhật. Kiểm tra browser với chính component, CSS build và font của production trên preview local cô lập.320/390/768/1440px không tràn ngang; chuyển chế độ, chọn1 giờ, lưu và giữ bản nháp khi làm mới PASS. Preview không gọi API production hoặc thay dữ liệu thật.

Giữ nguyên AdminShell và quyền `roles.manage`, các URL/API và sender `no-reply@mocmaria.com`. Hai trang có noindex. Không đổi backend, lịch đang lưu, danh sách email, người nhận Zalo hay Giang Xá. Tích hợp fast-forward các commit main mới trước phát hành; chỉ commit các file thuộc feature này.

## Production

Release UI `810413556361de2ae182181cb18d881e71159c32` đã qua GitHub Quality38513656877 và Vercel Production7057171613; `/api/release` xác nhận đúng SHA. Browser quản trị thật xác nhận hai email đang bật, một người nhận Zalo, lịch ngày09:00, pending0/failed0. Hai trang hiển thị giao diện mới; không thao tác lưu/xóa/bật tắt cấu hình hoặc gửi thông báo thật trong kiểm tra UI.
