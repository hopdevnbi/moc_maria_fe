export type AttendanceStatus =
  | "IN_RANGE"
  | "OUT_OF_RANGE"
  | "LOCATION_NOT_CONFIGURED"
  | "LOCATION_UNAVAILABLE";

export interface AttendanceBranch {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
  isActive?: boolean;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  staffName?: string;
  employeeName?: string;
  staff?: { displayName?: string; email?: string | null } | null;
  employee?: { displayName?: string; email?: string | null; phone?: string | null } | null;
  branchId: string;
  branchName?: string;
  branch?: AttendanceBranch | null;
  date?: string;
  attendanceDate?: string;
  localDate?: string;
  checkedInAt?: string;
  createdAt?: string;
  status: AttendanceStatus;
  distanceMeters?: number | null;
  accuracyMeters?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  coinsEarned: number;
  selfieUrl?: string | null;
}

export interface StaffAttendanceMe {
  today: AttendanceRecord | null;
  localDate: string;
  wallet: { balance: number; totalEarned: number };
  policy: {
    radiusMeters: number;
    coinsPerValidCheckIn: number;
    timezone: string;
    maxCheckInsPerDay: number;
  };
  alreadyCheckedIn?: boolean;
  branch?: AttendanceBranch | null;
  branches?: AttendanceBranch[];
  history?: AttendanceRecord[];
}

export interface AttendanceAdminSummary {
  totalCheckIns?: number;
  total?: number;
  inRange?: number;
  outOfRange?: number;
  locationNotConfigured?: number;
  coinsAwarded?: number;
  coinsEarned?: number;
  statuses?: Record<AttendanceStatus, number>;
  totalCoinsAwarded?: number;
}

export type AttendanceAdminList =
  | AttendanceRecord[]
  | {
      items?: AttendanceRecord[];
      records?: AttendanceRecord[];
      checkIns?: AttendanceRecord[];
      total?: number;
    };

export function attendanceRows(value: AttendanceAdminList | undefined): AttendanceRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.items ?? value.records ?? value.checkIns ?? [];
}

export function staffBranches(value: StaffAttendanceMe | undefined): AttendanceBranch[] {
  if (!value) return [];
  if (value.branches?.length) return value.branches;
  return value.branch ? [value.branch] : [];
}

export function isConfigured(
  branch: Pick<AttendanceBranch, "latitude" | "longitude"> | null | undefined,
): boolean {
  return (
    typeof branch?.latitude === "number" &&
    Number.isFinite(branch.latitude) &&
    branch.latitude >= -90 &&
    branch.latitude <= 90 &&
    typeof branch.longitude === "number" &&
    Number.isFinite(branch.longitude) &&
    branch.longitude >= -180 &&
    branch.longitude <= 180
  );
}

export function radiusMeters(branch: AttendanceBranch): number {
  return typeof branch.radiusMeters === "number" && branch.radiusMeters > 0
    ? branch.radiusMeters
    : 200;
}

export type LocationReading = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export function isUsableLocation(reading: LocationReading, now: number): boolean {
  return (
    isConfigured(reading) &&
    Number.isFinite(reading.accuracy) &&
    reading.accuracy >= 0 &&
    reading.accuracy <= 100 &&
    Number.isFinite(reading.timestamp) &&
    reading.timestamp <= now + 5000 &&
    now - reading.timestamp <= 30_000
  );
}

export function metersBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Foreground watch only: avoid an automatic write when location is stale or too imprecise.
export function mayAutoCheckIn(
  branch: AttendanceBranch,
  reading: { latitude: number; longitude: number; accuracy: number; timestamp: number },
  now: number,
): boolean {
  if (!isConfigured(branch)) return false;
  if (!isUsableLocation(reading, now)) return false;
  return (
    metersBetween(
      { latitude: branch.latitude!, longitude: branch.longitude! },
      { latitude: reading.latitude, longitude: reading.longitude },
    ) <= radiusMeters(branch)
  );
}

export function hcmDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formattedCheckInTime(value: string | undefined): string {
  if (!value) return "Chưa rõ thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function displayAttendanceDate(value: string | undefined | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "hôm nay";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/** The selfie belongs to the dated check-in record, not to the current profile. */
export function attendanceSelfieUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "giangxa-media-cdn.b-cdn.net" &&
      url.pathname.startsWith("/moc-maria/staff-attendance/")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function attendanceLabel(status: AttendanceStatus): string {
  switch (status) {
    case "IN_RANGE":
      return "Đủ điều kiện 200m";
    case "OUT_OF_RANGE":
      return "Ngoài phạm vi 200m";
    case "LOCATION_NOT_CONFIGURED":
      return "Cơ sở chưa có tọa độ";
    case "LOCATION_UNAVAILABLE":
      return "Không có GPS";
    default:
      return "Chưa xác định";
  }
}
