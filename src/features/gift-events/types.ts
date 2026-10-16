export type GiftEventStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED" | "ARCHIVED";
export type EventCampaign = {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string;
  heroUrl: string | null;
  termsText: string;
  termsVersion: number;
  status: GiftEventStatus;
  effectiveStatus: GiftEventStatus;
  startAt: string | null;
  endAt: string | null;
  serverNow: string;
  eligibleTiers: string[];
  budgetCapVnd: number;
  budgetReservedVnd: number;
  guaranteePrize: true;
  maxOpensPerUser: 1;
  requiresCompletedService: boolean;
  version: number;
};
export type CurrentEvent = {
  campaign: EventCampaign | null;
  status: "DISABLED" | "NONE" | "ACTIVE";
  serverNow: string;
};
export type EventMe = {
  eventId: string | null;
  status: string;
  serverNow: string;
  tier: string;
  eligible: boolean;
  canOpen: boolean;
  reason: string;
  attemptsRemaining: number;
  openId: string | null;
  rewardId: string | null;
};
export type WalletGift = {
  id: string;
  openId: string;
  eventId: string;
  prizeId: string;
  name: string;
  description: string;
  kind: string;
  config: Record<string, unknown>;
  allowedBranchIds: string[];
  status: "ISSUED" | "EXPIRED" | "REDEEMED" | "VOIDED";
  expiresAt: string;
  issuedAt: string;
  redeemedAt: string | null;
  redeemedBranchId: string | null;
};
export type GiftOpenResult = {
  openId: string;
  eventId: string;
  boxId: number;
  termsVersion: number;
  createdAt: string;
  reward: {
    id: string;
    prizeId: string;
    name: string;
    description: string;
    kind: string;
    config: Record<string, unknown>;
    expiresAt: string;
    status: WalletGift["status"];
  };
};

export const boxImages = [1, 2, 3, 4, 5, 6] as const;
export const statusLabels: Record<GiftEventStatus, string> = {
  DRAFT: "Bản nháp",
  SCHEDULED: "Sắp bắt đầu",
  LIVE: "Đang diễn ra",
  PAUSED: "Tạm dừng",
  ENDED: "Đã kết thúc",
  ARCHIVED: "Đã lưu trữ",
};

export function eligibilityCopy(
  campaign: EventCampaign | null,
  state: "loading" | "anonymous" | "authenticated",
  me?: EventMe,
): { tone: "success" | "muted" | "warning"; heading: string; detail: string } {
  if (!campaign)
    return {
      tone: "muted",
      heading: "Khu vườn đang được chuẩn bị",
      detail: "Mộc Maria sẽ công bố thể lệ và thời gian chính thức tại đây.",
    };
  if (campaign.effectiveStatus === "SCHEDULED")
    return {
      tone: "muted",
      heading: "Chúng mình đang chuẩn bị những món quà",
      detail: "Sự kiện chưa đến giờ bắt đầu; hãy xem thể lệ và quay lại khi chương trình mở.",
    };
  if (campaign.effectiveStatus === "PAUSED")
    return {
      tone: "warning",
      heading: "Chương trình đang tạm dừng",
      detail: "Các phần quà đã nhận vẫn nằm trong ví cá nhân của bạn.",
    };
  if (campaign.effectiveStatus !== "LIVE")
    return {
      tone: "muted",
      heading: "Chương trình đã khép lại",
      detail: "Cảm ơn bạn đã đồng hành. Quà đã nhận vẫn có thể xem trong ví.",
    };
  if (state === "loading")
    return {
      tone: "muted",
      heading: "Đang xác thực tài khoản",
      detail: "Vui lòng đợi trong giây lát.",
    };
  if (state === "anonymous")
    return {
      tone: "muted",
      heading: "Đăng nhập để kiểm tra lượt quà",
      detail: "Quyền tham gia và kết quả mở hộp luôn được xác minh tại máy chủ.",
    };
  if (!me)
    return {
      tone: "muted",
      heading: "Đang kiểm tra quyền tham gia",
      detail: "Không trừ lượt khi đang kiểm tra.",
    };
  if (me.reason === "ALREADY_PLAYED")
    return {
      tone: "success",
      heading: "Một món quà đã được dành cho bạn",
      detail: "Mỗi tài khoản chỉ có một lượt cho mỗi sự kiện. Hãy xem lại món quà trong ví.",
    };
  if (me.reason === "SERVICE_NOT_COMPLETED")
    return {
      tone: "warning",
      heading: "Sự kiện này dành cho khách đã trải nghiệm dịch vụ",
      detail: "Theo cấu hình của sự kiện, cần có ít nhất một buổi chăm sóc đã hoàn thành.",
    };
  if (me.reason === "INELIGIBLE_TIER")
    return {
      tone: "warning",
      heading: "Hạng hội viên chưa đủ điều kiện",
      detail: "Thể lệ quy định rõ những hạng được tham gia; hãy xem phần điều kiện bên dưới.",
    };
  if (me.reason === "EVENT_OUT_OF_STOCK")
    return {
      tone: "warning",
      heading: "Kho quà đang tạm hết",
      detail: "Lượt của bạn chưa bị trừ. Hãy quay lại khi ban tổ chức cập nhật.",
    };
  if (me.canOpen)
    return {
      tone: "success",
      heading: "Bạn có một lượt mở hộp quà",
      detail:
        "Hãy chọn hộp bạn yêu thích. Quà được xác định trên máy chủ, không phụ thuộc vào hình hộp.",
    };
  return {
    tone: "muted",
    heading: "Chưa có lượt mở hộp",
    detail: "Hãy xem lại điều kiện và trạng thái sự kiện.",
  };
}
