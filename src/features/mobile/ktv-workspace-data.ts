import type { Inquiry } from "./inquiries";
export interface ProviderFulfillment {
  inquiryId: string;
  status: string | null;
  version: number | null;
  startsAt: string | null;
  endsAt: string | null;
}
export const DEFAULT_DECLINE_REASON =
  "Rất tiếc, hiện tôi chưa thể tiếp nhận lịch chăm sóc này. Mong quý khách thông cảm và chọn KTV hoặc thời gian khác.";
export const DECLINE_REASON_OPTIONS = [
  {
    id: "schedule",
    label: "Trùng lịch phục vụ",
    description:
      "Rất tiếc, tôi có lịch phục vụ khác trùng khung giờ khách yêu cầu. Mong khách lựa chọn thời gian hoặc KTV khác.",
  },
  {
    id: "availability",
    label: "Không thể sắp xếp thời gian",
    description:
      "Rất tiếc, tôi chưa thể sắp xếp thời gian phục vụ vào khung giờ này. Mong khách thông cảm và lựa chọn thời gian khác.",
  },
  {
    id: "service",
    label: "Dịch vụ chưa phù hợp",
    description:
      "Sau khi trao đổi, tôi nhận thấy yêu cầu hiện tại chưa phù hợp với dịch vụ mình có thể cung cấp. Mong khách liên hệ Mộc Maria để được tư vấn thêm.",
  },
  {
    id: "location",
    label: "Không thể phục vụ tại địa điểm",
    description:
      "Rất tiếc, hiện tôi không thể phục vụ tại địa điểm khách đã yêu cầu. Mong khách thông cảm và trao đổi lại với Mộc Maria.",
  },
  {
    id: "personal",
    label: "Có việc đột xuất",
    description:
      "Rất tiếc, tôi có việc đột xuất nên không thể tiếp nhận lịch này. Mong khách thông cảm và lựa chọn KTV hoặc thời gian khác.",
  },
  {
    id: "other",
    label: "Lý do khác",
    description: DEFAULT_DECLINE_REASON,
  },
] as const;
export function completionAvailability(
  status: string,
  item: Pick<Inquiry, "appointmentId" | "requestedAt">,
  fulfillment: ProviderFulfillment | undefined,
  now: number,
): { allowed: boolean; message: string } {
  if (item.appointmentId) {
    if (status !== "IN_SERVICE")
      return {
        allowed: false,
        message: "Lịch chính thức cần được bắt đầu phục vụ trước khi báo hoàn thành.",
      };
    if (
      !fulfillment?.version ||
      !fulfillment.endsAt ||
      !Number.isFinite(Date.parse(fulfillment.endsAt))
    )
      return {
        allowed: false,
        message: "Chưa tải được thời gian kết thúc lịch chính thức. Hãy bấm tải lại lịch hẹn.",
      };
    if (Date.parse(fulfillment.endsAt) > now)
      return {
        allowed: false,
        message: `Lịch đang phục vụ. Bạn có thể đánh dấu hoàn thành từ ${workTime(fulfillment.endsAt)}, sau khi đã phục vụ xong.`,
      };
  } else {
    if (!["CONTACTED", "IN_SERVICE"].includes(status))
      return {
        allowed: false,
        message: "Bạn cần tiếp nhận và trao đổi với khách trước khi hoàn thành.",
      };
    if (!Number.isFinite(Date.parse(item.requestedAt)))
      return {
        allowed: false,
        message: "Chưa có thời gian khách đề nghị hợp lệ. Hãy liên hệ quản trị viên.",
      };
    if (Date.parse(item.requestedAt) > now)
      return {
        allowed: false,
        message: `Chưa đến giờ khách đề nghị. Bạn có thể đánh dấu hoàn thành từ ${workTime(item.requestedAt)}, sau khi đã thực sự phục vụ xong.`,
      };
  }
  return { allowed: true, message: "Chỉ xác nhận khi dịch vụ đã thực sự hoàn thành." };
}
export function workStatus(item: Inquiry, fulfillment?: ProviderFulfillment): string {
  if (fulfillment?.status) return fulfillment.status;
  if (item.status === "CANCELLED" || item.status === "DECLINED") return item.status;
  return item.providerCompletedAt ? "COMPLETED" : item.fulfillmentStatus || item.status;
}
export const workLabels: Record<string, string> = {
  PENDING: "Chờ phản hồi",
  CONTACTED: "Đang trao đổi",
  CONFIRMED: "Đã xác nhận",
  IN_SERVICE: "Đang phục vụ",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  DECLINED: "Chưa nhận",
};
export function hanoiDay(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function workTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Chưa có thời gian";
}
export function matchWorkSearch(value: string, query: string): boolean {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  return clean(value).includes(clean(query.trim()));
}
