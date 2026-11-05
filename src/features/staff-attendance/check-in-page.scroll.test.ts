import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const checkinCSS = readFileSync("src/features/staff-attendance/check-in-page.css", "utf8");
const attendanceCSS = readFileSync("src/features/staff-attendance/staff-attendance.css", "utf8");

describe("check-in scroll on Android Chrome, iOS Safari and standalone PWA", () => {
  it("has a dedicated vertical touch-scroller independent from body overflow locks", () => {
    const style = document.createElement("style");
    style.textContent = checkinCSS;
    document.head.append(style);
    try {
      const page = document.createElement("div");
      page.className = "mm-checkin-page";
      document.body.append(page);
      document.body.style.overflow = "hidden"; // stale modal lock from a previous route
      const computed = window.getComputedStyle(page);
      expect(computed.overflowY).toBe("auto");
      expect(computed.overflowX).toBe("hidden");
      expect(checkinCSS).toContain("height: 100dvh");
      expect(checkinCSS).toContain("-webkit-overflow-scrolling: touch");
      expect(checkinCSS).toContain("env(safe-area-inset-bottom)");
      page.remove();
    } finally {
      document.body.style.overflow = "";
      style.remove();
    }
  });

  it("does not intercept touch scrolling inside the rounded attendance card", () => {
    expect(attendanceCSS).toMatch(/\.mm-att-card\s*\{[^}]*overflow:\s*clip;/);
  });
});
