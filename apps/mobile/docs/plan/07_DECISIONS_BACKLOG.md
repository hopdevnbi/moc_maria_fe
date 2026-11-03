# 07 — Quyết định cần chốt, backlog và thứ tự làm

## Quyết định đề xuất (không tự coi là đã được duyệt)

| ID | Đề xuất | Trạng thái | Hệ quả |
| --- | --- | --- | --- |
| D01 | Dùng React Native + Expo + TypeScript, EAS cho Android/iOS; codebase mới riêng | ĐỀ XUẤT | Không tác động FE Next đang chạy |
| D02 | Dùng **chung FE Git repo**, nhánh **main-mobile**, Expo tại **apps/mobile/** trong worktree độc lập | ĐÃ CHỐT 03/11/2026 | Không can thiệp nhánh main, source Next.js hoặc BE; mobile CI riêng |
| D03 | Khởi đầu bằng màn hình khách và KTV; admin giữ trên web | ĐỀ XUẤT | Thu hẹp phạm vi, tránh port admin quá sớm |
| D04 | Native gọi trực tiếp API BE cho phần lớn dữ liệu; BFF web chỉ dùng nếu cần DTO tổng hợp ổn định | ĐỀ XUẤT | Không lệ thuộc server-only Next vào ứng dụng native |
| D05 | Mobile auth có refresh/session chính thức + SecureStore, BE hỗ trợ backward-compatible khi cần | CẦN CHỐT P0 | Login lâu dài được kiểm soát |
| D06 | MVP booking chọn **/appointment-inquiries** nếu ba route /bookings/* chưa được xác minh ở BE | CẦN CHỐT P0 | Không hứa xác nhận slot/giá chưa có |
| D07 | Chat khách/KTV dùng BE PostgreSQL + long-poll; Socket.IO chung chỉ cho catalog revision | ĐÃ XÁC MINH TỪ SOURCE | Không di chuyển messages |
| D08 | Queue chỉ server-to-server; push notifications phase riêng nếu BE chưa có device pipeline | ĐỀ XUẤT | Không nhúng Queue key vào app |
| D09 | Giữ nguyên data/demo policy: KTV demo chỉ để presentation theo điều kiện, không tự đặt lịch | CẦN CHỐT P0 | Không sai nghiệp vụ |
| D10 | Release backend additive trước khi bật tính năng native phụ thuộc nó | ĐỀ XUẤT | Web không gián đoạn |

## Backlog có thể giao cho agent sau khi duyệt

| Ticket | Ưu tiên | Công việc | Definition of Done |
| --- | --- | --- | --- |
| MOB-001 | P0 | Chốt API manifest và map DTO từ 4 source + OpenAPI runtime | Có contract versioned, lỗi response và quyền cho mọi màn hình MVP |
| MOB-002 | P0 | Native auth technical spike/safety design (không bypass Origin) | Login/refresh/rotate/logout được trên 2 OS ở staging; web regression pass |
| MOB-003 | P0 | Quyết định booking inquiry vs slot/quote | 1 state machine và endpoint hợp lệ; 3 GAP /bookings/* được xử lý rõ |
| MOB-004 | P0 | Catalog directory real/demo/alias contract | Provider approved + chat + schedulable mapping được test, không fake booking |
| MOB-005 | P1 | Scaffold app Expo tại FE/apps/mobile, navigation, design system, CI | Expo TypeScript/Android+iOS JS bundles và workflow trên main-mobile; EAS dev build/device QA còn chờ |
| MOB-006 | P1 | API client typed + session + query/cache lifecycle | 401/403/409/429/timeout xử lý và test đầy đủ |
| MOB-007 | P1 | Customer auth/profile/avatar | Login/session/logout và upload ảnh kiểm thử trên thiết bị |
| MOB-008 | P1 | Public home/KTV/service/branch | Giao diện/giá/ảnh đúng API thật, tìm kiếm và performance |
| MOB-009 | P1 | Booking hoặc appointment inquiry | Idempotency, trạng thái truthful, không double submit, tests |
| MOB-010 | P1 | Customer list lịch/yêu cầu | Danh sách đúng source, no-store, error/empty state |
| MOB-011 | P1 | KTV chat/text/image/privacy | Unread, retry identity, long-poll cancel, block/lock tests |
| MOB-012 | P2 | Gift event/wallet/QR | Server authority, chống double open/redeem, camera permissions |
| MOB-013 | P2 | KTV workspace/progress/safety | Role version handling, confirmation và audit |
| MOB-014 | P2 | Catalog revision socket fallback | Reconnect/foreground refetch, không tải private socket |
| MOB-015 | P3 | Push notifications endpoint/worker/native | Device token lifecycle, retry/delivery, opt-out, privacy |
| MOB-016 | P3 | QA/store release/internal test | Android/iOS E2E, privacy policy, store review và rollback |

## Các vấn đề kỹ thuật còn mở cần bằng chứng (không cần trả lời ngay trong giai đoạn audit)

1. BE đang deploy có /bookings/* không, hay chỉ /appointment-inquiries? Có cần trải nghiệm book theo slot+quote hay chỉ yêu cầu tư vấn?
2. Phiên native sẽ bổ sung refresh session backend hay dùng cookie-native chuẩn? Cần đánh giá bảo mật và thử nghiệm Android/iOS.
3. KTV demo/official roster có được đưa vào mobile public directory hay chỉ approved service providers? Bao nhiêu KTV thực có thể nhận booking?
4. Bản đầu cần đủ customer + KTV hay chỉ customer trước? Nên giữ admin web ít nhất trong MVP.
5. App tên hiển thị và bundle IDs, tài khoản store, quyền sử dụng brand assets, cấu hình staging/test accounts.
6. Bản đầu có yêu cầu camera QR, push thông báo, vị trí safety và Zalo/điều hướng web không?
7. Quy tắc xóa tài khoản và chính sách riêng tư khi phát hành Store.

## Cổng phê duyệt

- **Gate A:** xác nhận D01–D06 + P0 API manifest. Sau Gate A mới được tạo source mobile.
- **Gate B:** BE auth/booking contract (nếu phải thay) backward-compatible, có regression web.
- **Gate C:** customer E2E pass, sau đó KTV/gift/notification theo phạm vi đã duyệt.
- **Gate D:** Android/iOS store UAT + bảo mật + privacy + rollback.

## Quy tắc bảo toàn dự án hiện tại

4 repository vẫn đang phục vụ website/BE/chat/queue. Các agent triển khai tiếp **không được** reset/stash/cherry-pick/commit/push/deploy repo hiện tại theo kế hoạch này nếu chưa có chỉ định riêng; đặc biệt FE main hiện có thay đổi chưa commit. Mọi phát hiện mới phải cập nhật audit/decision logs trước khi thay đổi logic production.

**Kết thúc phiên:** chỉ lập kế hoạch; trạng thái các ticket MOB-* hiện đều là CHƯA THỰC HIỆN.
