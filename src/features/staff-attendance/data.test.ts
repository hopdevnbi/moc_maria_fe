import { describe, expect, it } from "vitest";
import {
  attendanceLabel,
  attendanceRows,
  attendanceSelfieUrl,
  displayAttendanceDate,
  hcmDate,
  isConfigured,
  mayAutoCheckIn,
  metersBetween,
  staffBranches,
} from "./data";

const branch = { id: "branch-1", name: "Mộc Maria", latitude: 21.03, longitude: 105.75 };

describe("staff attendance source data", () => {
  it("binds a selfie to its attendance day and only accepts the expected CDN path", () => {
    expect(displayAttendanceDate("2026-11-05")).toBe("05/11/2026");
    expect(displayAttendanceDate("invalid")).toBe("hôm nay");
    const url =
      "https://giangxa-media-cdn.b-cdn.net/moc-maria/staff-attendance/2026-11-05/record/photo.webp";
    expect(attendanceSelfieUrl(url)).toBe(url);
    expect(attendanceSelfieUrl("javascript:alert(1)")).toBeNull();
    expect(
      attendanceSelfieUrl("https://example.com/moc-maria/staff-attendance/photo.webp"),
    ).toBeNull();
    expect(
      attendanceSelfieUrl("https://giangxa-media-cdn.b-cdn.net/moc-maria/ktv/photo.webp"),
    ).toBeNull();
  });
  it("uses the Vietnam calendar for daily attendance", () => {
    expect(hcmDate(new Date("2026-11-04T17:30:00Z"))).toBe("2026-11-05");
  });
  it("requires valid saved branch coordinates", () => {
    expect(isConfigured({ ...branch, latitude: null })).toBe(false);
    expect(isConfigured(branch)).toBe(true);
    expect(metersBetween(branch, branch)).toBe(0);
    expect(metersBetween(branch, { latitude: 21.031, longitude: 105.75 })).toBeGreaterThan(100);
  });
  it("auto-checks in only on fresh accurate points within 200m", () => {
    const now = Date.parse("2026-11-04T08:00:00Z");
    const point = { latitude: 21.0305, longitude: 105.75, accuracy: 25, timestamp: now };
    expect(mayAutoCheckIn(branch, point, now)).toBe(true);
    expect(mayAutoCheckIn(branch, { ...point, latitude: 21.033 }, now)).toBe(false);
    expect(mayAutoCheckIn(branch, { ...point, accuracy: 180 }, now)).toBe(false);
    expect(mayAutoCheckIn(branch, { ...point, timestamp: now - 31000 }, now)).toBe(false);
    expect(mayAutoCheckIn(branch, { ...point, timestamp: NaN }, now)).toBe(false);
    expect(mayAutoCheckIn(branch, { ...point, accuracy: -1 }, now)).toBe(false);
    expect(mayAutoCheckIn(branch, { ...point, latitude: 100 }, now)).toBe(false);
  });
  it("parses backend envelopes and location-unavailable status", () => {
    const row = {
      id: "id",
      branchId: branch.id,
      status: "LOCATION_UNAVAILABLE" as const,
      coinsEarned: 0,
    };
    expect(attendanceRows({ items: [row], total: 1 })).toEqual([row]);
    expect(
      staffBranches({
        localDate: "2026-11-04",
        today: null,
        wallet: { balance: 0, totalEarned: 0 },
        policy: {
          radiusMeters: 200,
          coinsPerValidCheckIn: 5,
          timezone: "Asia/Ho_Chi_Minh",
          maxCheckInsPerDay: 1,
        },
        branches: [branch],
      }),
    ).toEqual([branch]);
    expect(attendanceLabel(row.status)).toBe("Không có GPS");
  });
});
