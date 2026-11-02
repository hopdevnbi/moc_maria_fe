import { describe, expect, it } from "vitest";
import type { Provider } from "@/features/marketplace/types";
import seeded from "./demo-ktvs.json";
import { officialKtvProfiles } from "./official-ktv-roster";

describe("official seven KTV roster", () => {
  const rows = officialKtvProfiles(seeded as Provider[]);
  it("has correct names and original identities", () => {
    expect(rows.map((r) => r.publicName)).toEqual([
      "Nguyệt Nguyễn",
      "Huyền Lành",
      "Hoàng Anh",
      "Sơn Tùng Thảo Y",
      "Bác sĩ Tiến Mạnh",
      "Nguyễn Hoàn",
      "Linh Đan",
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
  it("gives all seven KTVs their own Bunny CDN portrait", () => {
    const expected = [
      "nguyet-nguyen-a39108e3dbf4.jpg",
      "huyen-lanh-7b769c516db5.jpg",
      "hoang-anh-d5c54c85aed5.jpg",
      "son-tung-thao-y-7e43bee9234f.jpg",
      "bac-si-tien-manh-8122113ebff0.jpg",
      "nguyen-hoan-bdb912dad08b.jpg",
      "linh-dan-fb68af38e35e.jpg",
    ];
    expect(rows.map((r) => r.avatarUrl)).toEqual(
      expected.map(
        (file) => "https://giangxa-media-cdn.b-cdn.net/moc-maria/ktv/roster-20261101/" + file,
      ),
    );
  });
});
