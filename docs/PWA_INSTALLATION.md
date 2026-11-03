# Mộc Maria PWA — Cài vào màn hình chính

## Phạm vi

- PWA của website **mocmaria.com** (cả `www`). Không phải app React Native, không yêu cầu App Store / Play Store.
- Manifest: `src/app/manifest.ts`; biểu tượng `public/pwa/*.png` xuất từ chính `public/brand/moc-maria-official-20261013.png`, không vẽ lại logo. Chạy `node scripts/generate-pwa-icons.mjs` khi cần tái tạo.
- Service worker `public/sw.js`: cache duy nhất trang giải thích offline và biểu tượng. Mọi navigation ưu tiên network; API, chat, phiên đăng nhập, lịch hẹn, dữ liệu người dùng, response cá nhân **không được cache trong service worker**. Không có offline editing hay background sync.
- Install assistant: `src/shared/pwa/*`, gắn vào `AppProviders`; shortcut **Cài Mộc Maria** trong phần Tài khoản & bảo mật. Mọi hoạt động vẫn dùng các API hiện tại; không đổi BE/migration.
- Web event ở `event.mocmaria.com` là host độc lập: không hiển thị lời mời tùy chỉnh; người dùng nên cài từ `mocmaria.com`.

## Trải nghiệm

- Android Chrome/Edge: khi nhận `beforeinstallprompt`, cho người dùng nhấn nút trong hộp thoại tùy chỉnh để kích hoạt xác nhận cài đặt của trình duyệt. Nếu không nhận event, hướng dẫn mở menu và chọn cài/thêm màn hình chính.
- iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính → bật “Mở dưới dạng ứng dụng web” nếu có → Thêm. Không hiển thị nút cài một chạm giả trên iOS.
- Facebook, Instagram, Zalo/Messenger mở trang trong webview: hướng dẫn **Mở bằng trình duyệt**, kèm nút sao chép URL trang chủ, không tự ý chuyển trình duyệt hoặc cấp quyền.
- Lời mời nhỏ trên mobile chỉ sau ít nhất 14 giây **và** có tương tác, không hiện trên các luồng nhạy cảm như đặt lịch, chat, đăng nhập, tài khoản hay admin; không chen vào màn hình đang có dialog/đang nhập liệu. Tối đa một lần mỗi tab; đóng để ẩn trong 7 ngày. Nút ở Tài khoản vẫn chủ động mở lại hướng dẫn.
- Không hiện khi đang chạy standalone hoặc khi trình duyệt phát sự kiện `appinstalled`. Không tự xin quyền thông báo, vị trí hay camera.

## Checklist kiểm tra khi phát hành

1. Kiểm tra `/manifest.webmanifest`, `/sw.js`, `/pwa/icon-192.png`, `/pwa/icon-512.png`, `/pwa/icon-maskable-512.png` và `/pwa/apple-touch-icon.png` đều HTTP 200, đúng MIME/size.
2. Chrome Android HTTPS: cài từ lời mời; mở standalone; không còn lời mời. Nếu `beforeinstallprompt` chưa khả dụng, xác nhận UX dự phòng trong menu.
3. Safari iOS: đúng biểu tượng trên Home Screen và các bước Share/Add to Home Screen. Kiểm tra Safari và in-app Facebook/Zalo.
4. Không hiển thị CTA chồng lên Noel popup, chat KTV, nhập thông tin hay thanh điều hướng mobile. Thử viewport 320, 390, 768, 1440.
5. Thử offline: trang giải thích không chứa dữ liệu riêng; khi có mạng, lịch hẹn/chat/đặt lịch vẫn hoạt động như trước; xem Network/Cache Storage để xác nhận không có response API/HTML cá nhân.
6. Test/hệ thống: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; sau push xác minh Vercel READY và release SHA.

## Giới hạn

PWA là ứng dụng web cài trên màn hình chính, **không** tự động được đăng lên Google Play hay App Store. Người dùng phải xác nhận thao tác cài đặt. Phiên đăng nhập trong ứng dụng độc lập có thể khác phiên Safari/Chrome tùy hệ điều hành, vì vậy không bảo đảm đăng nhập được chuyển nguyên vẹn. Các chức năng đặt lịch, tin nhắn vẫn cần Internet; push notification và offline booking chưa nằm trong phạm vi lần này.

Nguồn kỹ thuật: MDN Making PWAs installable, MDN beforeinstallprompt; WebKit Safari 26.0; Apple Support Add to Home Screen; web.dev PWA caching/serving.
