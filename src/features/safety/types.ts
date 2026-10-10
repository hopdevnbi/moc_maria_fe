export interface SafetyPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
  receivedAt: string;
}
export interface SafetySession {
  id: string;
  providerName: string;
  inquiryId: string;
  status: string;
  sharing: boolean;
  startedAt: string;
  expiresAt: string;
  expectedCheckAt: string;
  endedAt?: string;
  locationState: string;
  overdue: boolean;
  visit: { customerName: string; serviceName: string; address: string } | null;
  point: SafetyPoint | null;
  sos: {
    id: string;
    status: string;
    raisedAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    note?: string;
    point: SafetyPoint | null;
  } | null;
}
export const ongoing = (s: SafetySession) => s.status === "TRAVELLING" || s.status === "ARRIVED";
export const time = (v: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(v));
export function pointState(s: SafetySession, now: number) {
  if (!ongoing(s) || Date.parse(s.expiresAt) <= now) return "ENDED";
  if (!s.sharing) return "PAUSED";
  if (!s.point) return "WAITING";
  return now - Date.parse(s.point.recordedAt) > 60000 ? "STALE" : "FRESH";
}
export const stateLabels: Record<string, string> = {
  FRESH: "Vị trí mới cập nhật",
  STALE: "Vị trí đã cũ · cần liên hệ KTV",
  WAITING: "Chưa nhận được GPS",
  PAUSED: "Đã tạm dừng GPS",
  ENDED: "Đã kết thúc chia sẻ",
};
