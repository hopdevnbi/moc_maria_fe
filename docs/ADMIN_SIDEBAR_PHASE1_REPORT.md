# Mộc Maria - Báo cáo Giai đoạn 1: Admin Workspace

## Đã làm
- Chuyển khu vực quản trị sang layout độc lập có sidebar desktop, topbar, breadcrumbs và menu trượt cho mobile.
- Nhóm sidebar: Tổng quan; KTV; Dịch vụ và bảng giá; Cơ sở và vận hành; Khách hàng; Hội viên VIP; Cấu hình.
- Link ba trang có thật, các chức năng còn ở Pull Request Draft được đánh dấu chờ phát hành, không tạo đường dẫn hỏng.
- RBAC dựa trên admin.portal, staff.manage, customers.manage và vai trò ADMIN/SUPER_ADMIN.
- Dashboard đẹp theo bộ màu xanh lá - ngà của Mộc Maria, không hiển thị dữ liệu KPIs giả.
- Bảo toàn code chức năng của các module KTV/dịch vụ/cơ sở và file kế hoạch đang do agent khác sửa.

## Các giai đoạn tiếp theo
2. Dashboard số liệu thật: bookings, KTV chờ duyệt, khách, dịch vụ, doanh thu theo API có quyền. Tránh hardcoded KPIs.
3. Phát hành quản lý khách và VIP sau khi hoàn thiện migration/authorization từ PR Draft: duyệt, từ chối, cấu hình quyền lợi, theo dõi lịch sử.
4. Nâng cấp danh sách KTV/dịch vụ/cơ sở: tìm kiếm, lọc, phân trang, CRUD mềm, hình ảnh CDN, cấu hình theo chi nhánh.
5. Realtime admin có xác thực, analytics, notifications. Tuyệt đối không đưa thông tin riêng tư lên socket công khai.

## Kiểm thử / phát hành
- Chạy format, lint, typecheck, unit tests, build Next.js.
- Xác minh role SUPER_ADMIN, BRANCH_MANAGER, RECEPTIONIST và việc ẩn các chức năng chưa sẵn sàng.
- PR, Vercel Preview, merge main, smoke test production.
