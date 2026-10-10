# Mộc Maria - Admin quản trị KTV dạng bảng - Giai đoạn KTV

## Mục tiêu người dùng
Thay danh sách ứng tuyển KTV dạng thẻ dài của \`/quan-tri/ktv\` bằng **table list có avatar**, dễ tìm/lọc, click KTV để xem trang chi tiết riêng. Giao diện phải đẹp và responsive mobile, không nhân bản API/quy trình xét duyệt đang có.

## Audit
- FE cũ \`TrainingAdmin\` tải \`GET /admin/provider-applications\` và \`GET /admin/provider-training/courses\`, render thẻ ứng viên và tạo khóa học song song. Click chỉ mở form dài ở dưới trang.
- BE \`GET /admin/provider-applications\` bảo vệ bằng \`staff.manage\`, trả \`ProviderApplication\` gồm \`id,userId,publicName,introduction,serviceArea,status,reviewNote,createdAt,updatedAt\` nhưng **thiếu avatar**.
- Avatar thật nằm ở \`staff_profiles.avatar_url\`. Không sử dụng ảnh demo để hiển thị nhầm người thật; public providers cố ý không công bố avatar nếu chưa có đồng ý.
- Quy trình xem xét status, audit, chứng nhận, thu hồi, readiness, lịch và eligibility đã tồn tại, không viết lại.

## Đã triển khai
- **Backend:** \`ProvidersService.listApplications()\` bổ sung \`avatarUrl\` từ staff profile theo \`userId\` với một query batch, không có N+1, không có migration và không thay public provider API.
- **Frontend list:** \`/quan-tri/ktv\` hiển thị bảng avatar thật/fallback initials, tên, mã hồ sơ rút gọn, khu vực, trạng thái, ngày cập nhật, nút Xem chi tiết.
- Tìm kiếm không dấu gồm đ/d, lọc trạng thái (Tất cả, Cần xử lý, Đào tạo, Đã duyệt, Tạm ngưng, Từ chối), sắp xếp mới/cũ/tên, phân trang 10 hồ sơ.
- KPI tính từ dữ liệu API thật: tổng hồ sơ, cần xử lý, đã duyệt. Không tạo số liệu giả.
- Mobile: bảng biến thành list hàng gọn có avatar và CTA full width ở màn nhỏ, không buộc ngang scroll.
- **KTV detail route:** \`/quan-tri/ktv/[id]\`, header ảnh/trạng thái/khu vực/ngày, nút quay lại, reuse nguyên \`ApplicationReview\` để quản lý status, giấy tờ, readiness, dịch vụ, lịch, đào tạo và chứng nhận.
- **Đào tạo:** tách sang tab "Đào tạo nội bộ", giữ form tạo khóa học và \`CourseProgramAdmin\` hiện có.
- Tiếp tục chặn tự xét duyệt bằng quyền \`roles.manage\` và kiểm tra \`userId\`; backend guard nguyên vẹn.

## Không thay đổi
- Không dùng ảnh minh họa/demo làm avatar KTV thật.
- Không tự cấp chứng nhận, tự duyệt hồ sơ, tạo role mới hay sửa quy tắc booking.
- Không expose avatar từ endpoint public chưa đủ consent.
- Không chạy migration database.
- Không viết lại module đào tạo/KTV hiện có, chỉ tái sử dụng và sắp lại UI.
- Giữ nguyên các thay đổi của agent khác trong source chính.

## Verification
- FE: \`npm.cmd run quality\` (Prettier, ESLint, TypeScript, Vitest, Next.js production build), **51/51 tests**, bao gồm 5 bài test tìm kiếm/lọc/sort/pagination/avatar mới. Next.js đã build route detail \`/quan-tri/ktv/[id]\`.
- BE: \`npm.cmd run typecheck\`, \`npm.cmd test -- --runInBand\` **27/27 tests**, \`npx.cmd eslint\` changed files, \`npm.cmd run build\`, đều đạt.
- BE có 2 test mới bảo đảm avatar thật/fallback null và không query profiles nếu không có ứng viên.

## Release order
1. PR Backend, GitHub CI; merge \`main\` và xác minh API admin sau khi deployment image production thành công.
2. PR Frontend, Vercel Preview; merge \`main\` và smoke \`/quan-tri/ktv\` và \`/quan-tri/ktv/[id]\` với tài khoản SUPER_ADMIN.
3. Chỉ yêu cầu sửa tiếp nếu user muốn thêm upload avatar, CRUD mềm, phân trang server-side hoặc biểu đồ/metrics.

## Gợi ý nâng cấp tiếp
- Khi số hồ sơ lớn: server-side cursor pagination/search/filter; hiện \`GET /admin/provider-applications\` trả toàn bộ danh sách (theo hợp đồng cũ).
- Upload/crop WebP avatar lên Bunny Storage với policy xác nhận của nhân sự trước khi lưu.
- Thêm lịch sử thay đổi trạng thái và audit timeline trong detail.
- Tách các tab chi tiết readiness/lịch/đào tạo nếu form quá dài trên mobile.
