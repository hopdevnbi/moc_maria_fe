import { describe, expect, it } from "vitest";
import { formatRequestDate, requestStatusLabels } from "./appointment-requests-admin";

describe("Admin appointment request presentation", () => {
  it("displays the actual inquiry lifecycle without inventing a confirmed booking", () => {
    expect(requestStatusLabels).toEqual({
      PENDING: "Chờ KTV phản hồi",
      CONTACTED: "Đang trao đổi",
      DECLINED: "Không thể phục vụ",
      CANCELLED: "Đã hủy",
    });
    expect(Object.keys(requestStatusLabels)).not.toContain("CONFIRMED");
  });

  it("formats requested appointment time in Vietnam, including at the day boundary", () => {
    expect(formatRequestDate("2026-10-13T17:00:00.000Z")).toMatch(/00:00.*14\/10\/2026/);
    expect(formatRequestDate("not-a-date")).toBe("Chưa có thời gian");
  });
});
