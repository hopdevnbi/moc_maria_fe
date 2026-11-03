# 06 — Kế hoạch QA, nghiệm thu và phát hành

## A. Preflight trước khi lập trình

- [ ] Snapshot lại 4 repo: branch, commit, worktree; phân biệt uncommitted FE và HEAD.
- [ ] Đối chiếu OpenAPI/Swagger/production route contract chỉ với quyền và môi trường được phép; không tạo dữ liệu khách hàng production.
- [ ] Xác minh booking flow đang được sử dụng thật và khác nhau giữa inquiry và slot/quote.
- [ ] Thống nhất mobile session refresh và kiểm thử CSRF/Origin/native cookie/device.
- [ ] Chốt danh sách màn hình/role cho bản đầu; asset/logo và ngôn ngữ.
- [ ] Quy hoạch app IDs, EAS environments, signing, service account và secure environment variables.
- [ ] Ghi lại trạng thái API contract/version và rollback BE/FE nếu có thay đổi additive.

## B. Unit/integration cho mobile

- [ ] Format tiền VNĐ, timezone, tên/ngày, normalize tiếng Việt.
- [ ] Public DTO parsing: services, provider ID/alias, branch, profile, real vs demo.
- [ ] 401 refresh single-flight; logout clear all private state; revoke và token expiry.
- [ ] API exception model, retry timeout, cancellation, unmounted states.
- [ ] Booking request idempotency, duplicate taps, stale slot/quote, status transitions.
- [ ] Chat dedup optimistic send, pagination, long-poll resume/cancel, unread/read.
- [ ] Chat private password lock/unlock, block/unblock, role restrictions.
- [ ] Upload ảnh ảnh đúng MIME/size, từ chối quyền, network interrupted.
- [ ] Gift play once/rate limit, voucher expiry/redeem server confirmation.
- [ ] KTV start/complete only allowed state and time; 409/version conflict safe UI.

## C. Test thiết bị và UX

| Kịch bản | Android | iOS |
| --- | --- | --- |
| Lần đầu mở, onboarding, login/logout và đóng/mở app | [ ] | [ ] |
| 320–430dp + màn lớn, font scaling + tiếng Việt | [ ] | [ ] |
| Danh sách KTV ảnh thật, tìm kiếm bỏ dấu, scroll/list perf | [ ] | [ ] |
| Đăng ký nhanh + đặt yêu cầu đúng user | [ ] | [ ] |
| Đổi mạng Wi-Fi/4G, offline → reconnect, request timeout | [ ] | [ ] |
| Chat gửi/nhận, ảnh, khóa riêng tư, unread count | [ ] | [ ] |
| App foreground/background, kill/reopen, session rotation | [ ] | [ ] |
| Camera/photo permission grant/deny/revoke | [ ] | [ ] |
| QR/voucher code expired, screenshot, double redeem | [ ] | [ ] |
| Role CUSTOMER/KTV/ADMIN bị truy cập sai chức năng | [ ] | [ ] |
| Deeplink đến KTV, dịch vụ, chat/booking khi chưa login | [ ] | [ ] |
| Accessibility: TalkBack/VoiceOver, contrast, hit target | [ ] | [ ] |

**Thiết bị:** ít nhất Android tầm trung và Android mới; iPhone màn nhỏ và iPhone đời mới. Không dựa duy nhất vào simulator/Expo Go. Dùng dev/staging account được phép; không test giao dịch khách thật.

## D. Backend compatibility regression

- [ ] FE web login/register/refresh/logout vẫn hoạt động nếu có thay đổi native auth.
- [ ] Customer inquiry, KTV status, admin dashboard và existing web chat không bị ảnh hưởng.
- [ ] Existing BE E2E theo module: auth-rbac, customer-experience, provider-workspace, ktv-chat, gift, profiles, safety.
- [ ] Không thay đổi schema ngoài migration additive được review; có rollback đã thử.
- [ ] Chat PostgreSQL giữ nguyên, không copy user/message sang MongoDB.
- [ ] Queue email/outbox vẫn hoạt động; không tăng truy cập trực tiếp từ mobile.
- [ ] Phát hành BE compatible trước native build; mỗi release có version và contract changelog.

## E. Performance và vận hành

- [ ] App startup hợp lý, không block startup vì public catalog error.
- [ ] List KTV không render lại toàn màn, image cache sized và lazy loading.
- [ ] Long-poll không tạo nhiều request song song, cancel khi background.
- [ ] Client retries có backoff và tôn trọng 429; không tạo bão request.
- [ ] Không có warning không rõ nguồn, uncaught promise, memory leak camera/socket.
- [ ] Logs có request-id/tracing nhưng không chứa PII/tokens.
- [ ] Error monitoring/analytics tối thiểu, build mapping phù hợp, consent/chính sách rõ.

## F. Store release

1. Chốt tên app, icon/splash, bundle ID Android package + iOS bundle identifier; quyền sử dụng logo/hình ảnh.
2. Chuẩn bị Google Play Console và Apple Developer; chỉ cấp quyền tối thiểu cho CI.
3. Build EAS staging/internal, Android closed test và iOS TestFlight; UAT với khách và KTV.
4. Privacy Policy, hỗ trợ xóa tài khoản, policy camera/photos/notifications/location tương ứng chức năng thực.
5. Runbook rollout: phased release + store monitoring, BE error rates, thời gian phản hồi chat, crash-free sessions, feedback.
6. Có kế hoạch rollback: dừng phát hành/disable feature flag khi có sự cố, rollback BE additive nếu an toàn, giữ nguyên data.
7. Sau mỗi release chạy smoke test không phá dữ liệu: public screens, đăng nhập test account, profile, read-only list, logout.

## G. Quy tắc làm việc của phiên audit này

- Không chạy bất kỳ test/build trên bốn repo gốc trong khi audit; không commit/push/deploy.
- Chỉ có quyền ghi **Plan Mobile/*.md** theo yêu cầu.
- Những checklist bên trên là việc cần làm **sau khi được chấp thuận bắt đầu code**; chưa tick hoàn thành.
