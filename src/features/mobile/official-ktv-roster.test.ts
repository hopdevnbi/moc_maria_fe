import { describe, expect, it } from "vitest";
import type { Provider } from "@/features/marketplace/types";
import seeded from "./demo-ktvs.json";
import { officialKtvProfiles } from "./official-ktv-roster";

describe("official seven KTV roster", () => {
  const rows = officialKtvProfiles(seeded as Provider[]);
  it("has correct names and original identities", () => {
    expect(rows.map((r) => r.publicName)).toEqual([
      "Nguyệt Nguyễn", "Huyền Lành", "Hoàng Anh", "Sơn Tùng Thảo Y",
      "Bác sĩ Tiến Mạnh", "Nguyễn Hoàn", "Linh Đan",
    ]);
    expect(rows.map((r) => r.id)).toEqual(
      Array.from({ length: 7 }, (_, i) => "demo-ktv-" + String(i + 1).padStart(2, "0")),
    );
  });
  it("never displays invented ages, experience or shifts", () => {
    for (const r of rows) {
      expect(r.age).toBeUndefined();
      expect(r.yearsExperience).toBeNull();
      expect(r.scheduleOpen).toBe(false);
    }
  });
});
