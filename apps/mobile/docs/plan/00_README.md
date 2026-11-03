# Mộc Maria Mobile — Kế hoạch trước khi triển khai

**Audit:** 03/11/2026 | **Trạng thái:** PLAN ONLY; chưa code, chưa commit/push/deploy.

Ứng dụng React Native + Expo + TypeScript là frontend native riêng tại **`moc_maria_fe/apps/mobile` trên nhánh `main-mobile`**, dùng chung tài khoản, dữ liệu và API với website Next.js đang chạy. Không viết lại backend, chat hoặc queue. Quyết định này thay thế đề xuất repository Git riêng trong bản plan gốc; dùng worktree độc lập để bảo vệ `main`.

## Bộ tài liệu
- `01_SOURCE_AUDIT.md`: baseline Git và nhận định từ code.
- `02_MOBILE_ARCHITECTURE.md`: cấu trúc app, auth và các service.
- `03_SCREEN_API_MATRIX.md`: mapping màn hình với endpoint hiện có.
- `04_IMPLEMENTATION_ROADMAP.md`: tiến độ, P0 và các mốc nghiệm thu.
- `05_SECURITY_AND_NATIVE.md`: bảo mật, lifecycle, ảnh, QR và push.
- `06_QA_RELEASE_CHECKLIST.md`: kiểm thử và release.
- `07_DECISIONS_BACKLOG.md`: quyết định và công việc còn mở.

## Nguyên tắc
- Không thay đổi 4 repository hiện tại trong giai đoạn lập kế hoạch.
- Mobile không truy cập PostgreSQL, MongoDB, Redis hoặc queue trực tiếp.
- Giữ nguyên nguồn sự thật Backend và chính sách RBAC.
- Chỉ dùng dữ liệu KTV/dịch vụ được cho phép, không biến dữ liệu demo thành booking thực.
- Xử lý đúng cơ chế refresh auth native và rà soát chênh lệch API booking trước code.
- Chỉ bắt đầu lập trình sau khi kế hoạch và các tiêu chí P0 được chốt.

**Giới hạn audit:** đọc source checkout local; không chứng nhận deploy production, không chạy test/migration, không gọi API production.
