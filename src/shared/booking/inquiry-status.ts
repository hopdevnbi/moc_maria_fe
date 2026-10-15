export type InquiryStatus =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";
export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  PENDING: "Chờ KTV phản hồi",
  CONTACTED: "Đang trao đổi",
  CONFIRMED: "Đã xác nhận",
  IN_SERVICE: "Đang phục vụ",
  COMPLETED: "Đã hoàn thành",
  DECLINED: "Không thể phục vụ",
  CANCELLED: "Đã hủy",
};
export const DEFAULT_BOOKING_NOTE =
  "Vui lòng liên hệ để xác nhận lịch và tư vấn trước khi phục vụ.";
export const DEFAULT_COMPLETION_NOTE = "Đã hoàn tất buổi chăm sóc theo lịch hẹn.";
export function defaultStatusNote(status: InquiryStatus | "ARCHIVE" | "RESTORE"): string {
  return {
    PENDING: "Chuyển lịch về chờ phản hồi để tiếp tục xác nhận với khách và KTV.",
    CONTACTED: "Đã tiếp nhận và đang trao đổi với khách hàng về lịch chăm sóc.",
    CONFIRMED: "Đã thống nhất thời gian và dịch vụ với khách hàng và KTV.",
    IN_SERVICE: "Bắt đầu phục vụ khách theo lịch chăm sóc đã xác nhận.",
    COMPLETED: DEFAULT_COMPLETION_NOTE,
    DECLINED: "Chưa thể tiếp nhận lịch chăm sóc này; cần trao đổi lại với khách hàng.",
    CANCELLED: "Hủy lịch chăm sóc theo kết quả xử lý của người thao tác.",
    ARCHIVE: "Lưu trữ yêu cầu đã xử lý và giữ lại đầy đủ lịch sử trao đổi.",
    RESTORE: "Khôi phục yêu cầu để tiếp tục theo dõi và xử lý lịch chăm sóc.",
  }[status];
}
export function inquiryDisplayStatus(value: {
  status: string;
  appointmentId?: string;
  fulfillmentStatus?: string;
  providerCompletedAt?: string;
}): InquiryStatus {
  if (value.status === "CANCELLED" || value.status === "DECLINED") return value.status;
  if (value.appointmentId && value.fulfillmentStatus)
    return value.fulfillmentStatus as InquiryStatus;
  if (value.providerCompletedAt) return "COMPLETED";
  return value.status as InquiryStatus;
}
