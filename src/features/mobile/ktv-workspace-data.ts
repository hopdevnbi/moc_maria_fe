import type { Inquiry } from "./inquiries";
export interface ProviderFulfillment {
  inquiryId: string;
  status: string | null;
  version: number | null;
  startsAt: string | null;
  endsAt: string | null;
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
