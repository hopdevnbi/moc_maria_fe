const messages = {
  "nav.home": "Trang chủ",
  "today.refresh": "Làm mới tổng quan",
  "worker.balance": "Coin hiện có",
  "worker.coinUnit": "coin",
  "wheel.title": "Vòng xoay may mắn",
  "wheel.subtitle": "MỘC MARIA · COIN TÀI KHOẢN",
  "wheel.red": "Đỏ",
  "wheel.black": "Đen",
  "wheel.green": "Xanh",
  "wheel.countdown": "Còn {seconds}s",
  "wheel.roundLabel": "Vòng",
  "wheel.countdownLabel": "Thời gian nhận lượt chơi còn lại",
  "wheel.wheelLabel": "Vòng quay 15 ô: 0 xanh, số lẻ đỏ, số chẵn đen",
  "wheel.spinning": "Vòng quay đang chạy…",
  "wheel.waitingResult": "Chờ kết quả vòng đầu tiên",
  "wheel.placeTitle": "Chọn màu may mắn",
  "wheel.grossHelp": "Đỏ, đen ×2 · Xanh ×14. Coin nhận đã bao gồm coin đặt.",
  "wheel.chooseColor": "Màu của bạn",
  "wheel.stake": "Coin đặt",
  "wheel.reserved": "Coin đang tạm giữ",
  "wheel.checkingEntry": "Đang kiểm tra lượt chơi",
  "wheel.confirmedEntry": "Đã xác nhận lượt chơi",
  "wheel.reserveDetail": "Tạm giữ {stake} coin · {color}",
  "wheel.sending": "Đang xác nhận…",
  "wheel.confirmBet": "Xác nhận lượt chơi",
  "wheel.offline": "Bạn đang ngoại tuyến. Kết nối lại để tiếp tục.",
  "wheel.readError": "Chưa đồng bộ được vòng chơi.",
  "wheel.currentBet": "Đã đặt {stake} coin vào {color} trong vòng này.",
  "wheel.accepted": "Lượt chơi đã được ghi nhận.",
  "wheel.betError": "Không thể nhận lượt chơi. Hãy kiểm tra và thử lại.",
  "wheel.uncertain":
    "Chưa rõ lượt chơi đã được nhận hay chưa. Đang kiểm tra; không đặt thêm lượt mới.",
  "wheel.retrySame": "Kiểm tra lại cùng lượt chơi",
  "wheel.coinPolicy": "Chỉ dùng coin nội bộ đã có. Không nạp tiền, chuyển coin hoặc đổi tiền.",
  "wheel.roundHelp":
    "Mỗi vòng 20 giây · 1 lượt/người · 1–100 coin. Đã xác nhận thì không sửa hoặc hủy. 0 xanh; 1–14 xen kẽ đỏ và đen.",
  "wheel.recentResults": "Kết quả gần đây",
  "wheel.noResults": "Chưa có kết quả.",
  "wheel.proofTitle": "Kiểm chứng kết quả",
  "wheel.proofHelp":
    "Kết quả được tạo ngẫu nhiên và mã hóa trước khi nhận lượt chơi. Mã cam kết SHA-256 được công bố trước; số và chuỗi bí mật được mở sau khi khóa vòng để trình duyệt đối chiếu.",
  "wheel.currentCommitment": "Cam kết vòng hiện tại",
  "wheel.revealedNonce": "Chuỗi bí mật vòng đã mở",
  "wheel.verification": "Đối chiếu SHA-256",
  "wheel.verified": "Đã khớp mã cam kết",
  "wheel.myHistory": "Lượt chơi của tôi",
  "wheel.noBets": "Bạn chưa có lượt chơi nào.",
  "wheel.pending": "Đang chờ",
  "wheel.lost": "Không trúng",
  "wheel.closed": "Vòng đã khóa. Chọn vòng tiếp theo.",
  "wheel.alreadyBet": "Bạn đã có một lượt trong vòng này.",
  "wheel.insufficient": "Số dư coin không đủ.",
  "wheel.requestConflict": "Mã lượt chơi đã dùng cho lựa chọn khác.",
  "wheel.live": "Đang mở",
  "wheel.bannerHelp": "Dùng coin nội bộ, chọn một màu và cùng chờ vòng quay mỗi 20 giây.",
  "wheel.historyDebit": "Coin đặt vòng quay",
  "wheel.historyCredit": "Coin trúng vòng quay",
  "wheel.proofMismatch": "Kết quả chưa khớp cam kết. Tạm dừng chơi và tải lại.",
  "guest.mode": "MỘC MARIA · CHƠI THỬ MIỄN PHÍ",
  "guest.balance": "Coin thử trong phiên",
  "guest.free": "Miễn phí · Không cần tài khoản",
  "guest.expiry":
    "Coin thử chỉ ở tab này. Tải lại trang vẫn giữ; đóng tab hoặc sang ngày mới lúc 00:00 giờ Việt Nam thì về 0. Nếu trình duyệt chặn lưu trữ, tải lại sẽ xóa coin.",
  "guest.setLabel": "Số coin thử bạn muốn",
  "guest.setAction": "Bắt đầu phiên thử",
  "guest.end": "Kết thúc phiên",
  "guest.setHelp": "Chọn 0–{max} coin. Bắt đầu lại sẽ xóa lịch sử và lượt đang chờ của phiên thử.",
  "guest.setError": "Chưa đặt được số coin. Hãy nhập số nguyên trong giới hạn.",
  "guest.accountHelp": "Đã có tài khoản? Dùng ví coin nội bộ trong khu vực đăng nhập.",
  "guest.accountAction": "Chơi bằng coin tài khoản",
  "guest.policy":
    "Coin thử chỉ để trải nghiệm, không có giá trị đổi thưởng và không cộng vào ví tài khoản.",
  "guest.proofHelp":
    "Phiên thử tạo kết quả mã hóa và cam kết ngay trên thiết bị, theo đồng hồ của bạn. Mã đối chiếu chỉ kiểm tra kết quả cục bộ; đây không phải vòng coin nội bộ trên máy chủ.",
  "guest.metaTitle": "Vòng xoay may mắn miễn phí",
  "guest.metaDescription":
    "Chơi thử vòng quay không cần tài khoản, tự chọn coin thử trong phiên và làm quen luật chơi.",
  "guest.loginHelp":
    "Bạn có thể chơi thử ngay mà không cần tài khoản. Đăng nhập bên dưới để dùng ví coin nội bộ.",
  "guest.playFree": "Chơi thử không cần đăng nhập",
} as const;
export type MessageKey = keyof typeof messages;
const t = (key: MessageKey, values?: Record<string, string | number>) => {
  let text: string = messages[key];
  for (const [name, value] of Object.entries(values ?? {}))
    text = text.replaceAll(`{${name}}`, String(value));
  return text;
};
export const useI18n = () => ({ t, locale: "vi-VN" });
