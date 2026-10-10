import { describe, expect, it } from "vitest";
import type { Application } from "./types";
import {
  countKtvStatus,
  filterKtvApplications,
  foldVietnamese,
  initialsForName,
  pageCount,
} from "./ktv-admin-utils";

const list = [
  {
    id: "1",
    publicName: "Linh Anh",
    serviceArea: "Đan Phượng",
    status: "APPLIED",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "2",
    publicName: "Mai Anh",
    serviceArea: "Hà Nội",
    status: "REVIEWING",
    createdAt: "2026-10-03T00:00:00Z",
  },
  {
    id: "3",
    publicName: "Thu Hà",
    serviceArea: "Tân Tây Đô",
    status: "APPROVED",
    createdAt: "2026-10-02T00:00:00Z",
  },
  {
    id: "4",
    publicName: "Bảo Ngọc",
    serviceArea: "Đống Đa",
    status: "TRAINING",
    createdAt: "2026-10-04T00:00:00Z",
  },
] as Application[];

describe("KTV admin directory", () => {
  it("searches accent-insensitively including đ/d", () => {
    expect(foldVietnamese("Đan Phượng")).toBe("dan phuong");
    expect(filterKtvApplications(list, "dang phuong", "ALL", "NEWEST")).toHaveLength(0);
    expect(filterKtvApplications(list, "dan phuong", "ALL", "NEWEST").map((x) => x.id)).toEqual([
      "1",
    ]);
    expect(filterKtvApplications(list, "thu ha", "ALL", "NEWEST").map((x) => x.id)).toEqual(["3"]);
  });
  it("groups candidate reviews and training without including approved candidates", () => {
    expect(countKtvStatus(list, "PENDING")).toBe(2);
    expect(countKtvStatus(list, "TRAINING")).toBe(1);
    expect(countKtvStatus(list, "APPROVED")).toBe(1);
  });
  it("sorts newest, oldest and names consistently", () => {
    expect(filterKtvApplications(list, "", "ALL", "NEWEST")[0].id).toBe("4");
    expect(filterKtvApplications(list, "", "ALL", "OLDEST")[0].id).toBe("1");
    expect(filterKtvApplications(list, "", "ALL", "NAME")[0].id).toBe("4");
  });
  it("paginates empty and filled sets without page zero", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(2);
    expect(pageCount(21)).toBe(3);
  });
  it("produces fallback avatars from real names", () => {
    expect(initialsForName("Linh Anh")).toBe("LA");
    expect(initialsForName("Ngọc")).toBe("NG");
  });
});
