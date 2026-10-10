# Mộc Maria — Audit quản trị & lộ trình Hội viên VIP (2026-10-10)

## 1. Mục tiêu

Mobile-first: khách đăng ký tài khoản/đặt lịch/chọn KTV và có thể xin xét VIP. Admin (không phải nhân viên chung) phê duyệt. Admin có khu vực quản trị thống nhất, **tái sử dụng** các module KTV, catalog, cơ sở, auth hiện hữu; không tạo user/membership khác khi đã có tài khoản.

## 2. Hiện trạng đã kiểm tra trong source

| Phạm vi | Đã có | Thiếu hoặc cần nâng cấp |
| --- | --- | --- |
| Tài khoản | `auth/register`, `auth/me`, `customers/me`, roles, session, audit logs | danh sách khách admin, tìm/filter, lịch sử hoạt động thống nhất, admin sửa dữ liệu an toàn |
| KTV | `provider-applications`, admin review, training/certificates, schedules, eligibility; UI `/quan-tri/ktv` | gom lại thông tin, lọc phân trang, avatar, cấu hình dễ hiểu; thao tác tắt hồ sơ; không xóa chứng nhận/booking |
| Dịch vụ | `admin/services` GET/POST/PATCH, variants, categories, policy; UI `/quan-tri/dich-vu` | gom bảng giá và xuất bản; ngừng cung cấp/ẩn thay vì xóa lịch sử; kiểm soát ảnh |
| Cơ sở | `admin/branches`, lịch hoạt động, ngoại lệ, tài nguyên; UI `/quan-tri/co-so` | cấu hình theo chi nhánh cho nhiều cơ sở; mặc định Tân Tây Đô |
| Khách hàng | `customers` liên kết `users`, `customers.manage` | chưa có màn danh sách admin trước đây |
| VIP | trang `/hoi-vien` chỉ là nội dung định hướng, chưa có VIP thực | yêu cầu duyệt, hồ sơ VIP, cấu hình và lịch sử thay đổi |
| Đặt lịch | AT_BRANCH preview, AT_HOME policies exist | Backend chưa mở nhận đặt lịch chính thức (requestEnabled false); không gắn quyền lợi/điểm thưởng với booking chưa xác nhận |

**Không duplicate:** VIP dùng `users.id`/`customers.user_id` hiện có; không tạo role `VIP`, không tạo bản sao hồ sơ KTV hoặc dịch vụ.

## 3. Thiết kế hội viên

- **Khách thường**: trạng thái mặc định sau đăng ký tài khoản thành công.
- **Yêu cầu VIP**: `PENDING` → Admin `APPROVED` hoặc `REJECTED`; có người xét, thời gian, ghi chú, audit.
- **Hội viên VIP**: `ACTIVE`; có thời điểm bắt đầu, hạn sử dụng tùy cấu hình; Admin có thể `SUSPENDED`, hoặc trạng thái hiệu lực tự suy ra `EXPIRED` từ thời gian.
- Chỉ cho **một yêu cầu PENDING/người dùng** qua unique partial index; đăng ký lại cùng lúc không tạo duplicate.
- Mặc định **không có ưu đãi/giảm giá/điểm thưởng**. Admin công bố quyền lợi trước; việc áp dụng giá ưu đãi trong checkout phải có nghiệp vụ và audit riêng.
- Không xóa cứng hội viên/khách đã có dữ liệu liên quan; thay bằng tạm ngừng, vô hiệu tài khoản hoặc hủy giao dịch với nhật ký.
- Public endpoint `GET /membership/me` và POST `/membership/requests` chỉ sau đăng nhập khách; mọi response riêng tư `no-store`.

## 4. Quyền và an toàn

| Vai trò | Quản lý tài khoản | Duyệt VIP | Cấu hình VIP | KTV / dịch vụ |
| --- | --- | --- | --- | --- |
| SUPER_ADMIN | Toàn bộ | Có | Có | Toàn bộ |
| ADMIN | Theo quyền | Có | Có | Theo quyền |
| BRANCH_MANAGER | Theo quyền chi nhánh | Không | Không | Chi nhánh được giao |
| RECEPTIONIST | Khách hàng theo quyền | Không | Không | Không được cấp tự động |
| KTV | Hồ sơ của mình | Không | Không | Không |
| CUSTOMER | Hồ sơ cá nhân | Gửi yêu cầu | Không | Xem công khai |

**Lưu ý RBAC:** `customers.manage` đã được cấp cho cả BRANCH_MANAGER và RECEPTIONIST. VIP review phải đồng thời có `customers.manage` **và** vai trò `ADMIN` hoặc `SUPER_ADMIN`.

## 5. Các màn quản trị

- `/quan-tri`: hub KPI số khách, yêu cầu VIP đang chờ, VIP hiệu lực, KTV cần duyệt, dịch vụ đã công bố (KPI live ở phase tiếp theo).
- `/quan-tri/khach-hang`: tìm kiếm tên/email/số điện thoại, trạng thái kích hoạt, hạng VIP; khóa/mở lại nếu được cấp `users.manage`.
- `/quan-tri/hoi-vien`: 4 tab **Chờ xét duyệt / Hội viên VIP / Khách hàng / Cấu hình**; phê duyệt yêu cầu ghi lý do, tạm dừng/khôi phục, mô tả quyền lợi, thời hạn, bật/tắt tiếp nhận.
- `/quan-tri/ktv`: **tái sử dụng** `TrainingAdmin`, thêm lọc/sort/hình đại diện và hành động duyệt/tắt theo API sẵn.
- `/quan-tri/dich-vu`: **tái sử dụng** `CatalogAdmin`, quản lý danh mục/gói/giá/công bố, bổ sung archived thay xóa cứng.
- `/quan-tri/co-so`: giữ UI và API đã có.

Mobile: tab ngang cuộn, form trên card lớn, nút thao tác cao tối thiểu 44px, không bắt Admin phải dùng desktop.

## 6. API VIP phase 1

- `GET /membership/me` → `{tier, status, membership, request, settings}`
- `POST /membership/requests` `{note?}` → yêu cầu `PENDING`
- `GET /admin/membership/requests?status=PENDING&limit=30`
- `PATCH /admin/membership/requests/:id/review` `{decision: APPROVE|REJECT, reason}`
- `GET /admin/membership/customers?limit=&q=`
- `GET /admin/membership/members?limit=`
- `PATCH /admin/membership/members/:id/status` `{status:ACTIVE|SUSPENDED,reason}`
- `GET /admin/membership/settings`, `PATCH /admin/membership/settings`

Migration tạo `vip_membership_settings`, `vip_membership_requests`, `vip_memberships`; toàn bộ chỉnh sửa quan trọng ghi `audit_logs`.

## 7. Lộ trình tiếp tục

**P1 — VIP approval MVP:** Migration + API + mobile request + admin review/config; test role guards, idempotency, concurrent requests; deploy BE migration trước FE.

**P2 — Customer Management chuẩn:** Backend phân trang/cursor, search, admin cập nhật profile an toàn, tạo tài khoản khách với xác minh thông tin, khóa/mở, xem lịch sử; FE mobile data table/list. Không cho đổi role từ màn khách hàng.

**P3 — KTV & Service console nâng cao:** lọc/phân trang; avatar/media upload Bunny; CRUD cấu hình nhưng chỉ soft archive khi đã có lịch sử; chính sách dịch vụ theo chi nhánh/khu vực.

**P4 — Cấu hình quyền lợi chính thức:** Admin nhập tiêu chí (số buổi *COMPLETED*, doanh thu/điểm), chiết khấu có hạn, voucher, quyền đặt lịch; tạo event từ backend, test chống cộng điểm trùng, có thể cấu hình thủ công/duyệt tự động theo điều kiện khi đủ dữ liệu. **Không triển khai P4 khi booking còn requestEnabled=false.**

**P5 — Realtime và phân tích:** Socket gửi event PRIVATE theo user/admin, không dùng public catalog namespace để phát lộ tên/số điện thoại; invalidation query cache sau event; báo cáo VIP và retention theo số liệu được xác nhận.

## 8. Release gates

1. BE tests + CI; migration trên staging và rollback được review.
2. Chạy migration production trước, xác minh API bảo vệ bằng RBAC.
3. Sau đó mới deploy FE; thử khách thường, khách PENDING, VIP ACTIVE/SUSPENDED/EXPIRED, Admin/Receptionist.
4. Quan sát 5xx, DB locks và CORS; rollback FE độc lập.
5. Không tự cấp ưu đãi, trừ khi chủ cơ sở công bố chính sách rõ ràng.
