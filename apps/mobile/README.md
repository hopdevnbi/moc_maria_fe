# Mộc Maria — ứng dụng React Native (nhánh `main-mobile`)

Ứng dụng iOS/Android viết bằng **Expo SDK 58 + React Native 0.88 + TypeScript**. Source đặt tại `apps/mobile/` trong **cùng Git repository** với Next.js Frontend, nhưng phát triển trên nhánh **`main-mobile`**, được tạo từ `origin/main` tại commit `ededbe0` ngày 03/11/2026.

Trang web hiện tại dùng `src/` ở root, không bị chuyển đổi hoặc triển khai lại. **Không merge nhánh mobile vào main khi chưa có kế hoạch hợp nhất**; branch riêng có cùng lịch sử Git FE nhưng độc lập cho phát triển.

## Khởi động trên Windows

Yêu cầu Node.js 22.13+ và npm, Android Studio hoặc điện thoại Android/iPhone có Expo Go cho kiểm tra bước đầu. Để kiểm thử native thực tế, dùng Expo Development Build.

```powershell
cd "D:\DASH vs Shopify\Acutis Education\Mộc Maria\moc_maria_fe_main_mobile\apps\mobile"
npm ci
npm run lint
npm run typecheck
npx expo start
```

Cấu hình API public trong `.env` (từ `.env.example`), ví dụ:

```
EXPO_PUBLIC_API_BASE_URL=https://api.mocmaria.com/api/v1
```

**Không** đưa bất kỳ key/token/credential vào biến `EXPO_PUBLIC_*` vì giá trị này được nhúng vào app. Dùng `npx expo start --clear` khi cập nhật config.

## Kiến trúc và màn hình

- Bottom navigation: Trang chủ, Dịch vụ, Đặt lịch, Tin nhắn, Tài khoản.
- Trang chủ, chuyên viên và dịch vụ công khai gọi trực tiếp GET `/providers`, `/services`, `/branches`, `/providers/:id`, `/services/:slug` của NestJS tại `https://api.mocmaria.com/api/v1`.
- Đăng nhập, đăng ký, xem/sửa hồ sơ và avatar sử dụng Auth/Profiles API sẵn có.
- **Đặt lịch bản đầu** là gửi **yêu cầu chờ xác nhận** qua `POST /appointment-inquiries` với UUID idempotency; không đặt lịch theo slot/quote hoặc hứa giữ chỗ. Các route cũ `/bookings/requests`, `/bookings/me`, `/bookings/:id/confirm-quote` từ FE web chưa có controller tương ứng trong BE checkout audit.
- Tin nhắn khách–KTV dùng `/ktv-chat/threads` tại **Mộc Maria BE/PostgreSQL**, không dùng chat MongoDB của Acutis Chat. Có inbox, read, gửi text/ảnh, cập nhật long-poll khi foreground, mở khóa cuộc trò chuyện khi cần.
- Ví quà chỉ đọc + liên kết trang sự kiện `https://event.mocmaria.com/`; KTV workspace xem danh sách/tiến độ read-only. **Không tự thực hiện** đổi mã quà hoặc đổi trạng thái phục vụ khi hợp đồng API/permission chưa xác minh.
- State private là memory + token trong `expo-secure-store`, không chạm DB, Redis hoặc Queue trực tiếp.

## Chặn phát hành (P0 chưa giải quyết)

1. **Refresh phiên native**: Backend refresh hiện dùng HttpOnly browser cookie + Origin policy. App không giả mạo Origin hay bỏ bảo vệ web. Hiện chỉ khôi phục access token khi còn hạn qua GET `/auth/me`; hết hạn phải đăng nhập lại. Trước khi phát hành cần triển khai hợp đồng refresh native tương thích ngược với BE, có rotate/revoke và test Android/iOS.
2. **Contract đặt lịch**: xác nhận flow sản phẩm có dùng `/appointment-inquiries` hay backend booking slot/quote khác; app chưa cung cấp lịch chính thức hoặc quote confirmation cho đến khi có API thật.
3. **Directory/alias KTV**: trang web kết hợp một số demo/presentation profile và chat alias; mobile hiện dùng GET /providers trực tiếp. Cần kiểm thử field/điều kiện eligibility với dữ liệu thật để tránh sai danh sách.
4. **Kiểm thử thiết bị thật**: code đã typecheck/bundle, chưa chứng nhận UX hoặc toàn bộ nghiệp vụ Android/iOS. Không đăng Store trước QA, privacy policy/account deletion và kiểm tra quyền photo/chat.
5. **EAS publishing**: package id `com.mocmaria.mobile` là cấu hình dự kiến; cần xác nhận tên/bundle IDs, credentials/signing và tài khoản Expo/Apple/Google trước build phát hành. Chưa chạy EAS Submit, chưa deploy backend.

## Kiểm tra CI

```powershell
npm run typecheck
npm run lint
npm run bundle:android
npm run bundle:ios
```

Nhánh `main-mobile` có workflow mobile quality riêng. Workflow của website root chỉ chạy trên `main` nên không bị kích hoạt khi push nhánh này.

## Build sau khi chuẩn bị credentials

```powershell
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

Không lưu credentials/signing assets trong source. Build iOS EAS cần Apple signing setup; người dùng phải cấp quyền qua workflow chính thức.

## Handoff

- Chi tiết audit và roadmap: `apps/mobile/docs/plan/`.
- Nhật ký nhánh: `docs/MOBILE_BRANCH_HANDOFF.md` tại root FE.
- Không có migration, sửa BE, đổi các thành phần Next.js hoặc dữ liệu khách thật trong đợt này.
