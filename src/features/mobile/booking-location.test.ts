import { describe, expect, it } from "vitest";
import { homeTerritories, isEligibleForMode, isPrimaryBranch } from "./booking-location";
import type { Branch, Provider } from "@/features/marketplace/types";
const provider = {
  id: "p1",
  publicName: "KTV A",
  bookable: true,
  eligibleServices: [
    {
      policyId: "a",
      serviceId: "s1",
      serviceName: "Thư giãn",
      branchId: "b1",
      branchName: "Mộc",
      mode: "ON_SITE",
      jurisdictionCode: "HQ",
      territoryLabel: "Tại quán",
      travelBufferMinutes: 0,
      travelFeeVnd: "0",
      maxRadiusKm: null,
    },
    {
      policyId: "b",
      serviceId: "s2",
      serviceName: "Chăm sóc tại nhà",
      branchId: "b1",
      branchName: "Mộc",
      mode: "AT_HOME",
      jurisdictionCode: "DAN_PHUONG",
      territoryLabel: "Đan Phương",
      travelBufferMinutes: 60,
      travelFeeVnd: "100000",
      maxRadiusKm: 12,
    },
  ],
} as Provider;
describe("booking destination choice", () => {
  it("recognizes only Tân Tây Đô location", () => {
    expect(isPrimaryBranch({ address: "Ô 12 LK2 KĐT Tân Tây Đô" } as Branch)).toBe(true);
    expect(isPrimaryBranch({ address: "Hà Đông, Hà Nội" } as Branch)).toBe(false);
  });
  it("uses only approved areas and never treats demo KTV as eligible", () => {
    const demo = { ...provider, isDemo: true } as Provider;
    expect(homeTerritories([provider, demo])).toEqual([
      { code: "DAN_PHUONG", label: "Đan Phương" },
    ]);
    expect(isEligibleForMode(provider, "AT_BRANCH", "", "s1")).toBe(true);
    expect(isEligibleForMode(provider, "AT_HOME", "DAN_PHUONG", "s2")).toBe(true);
    expect(isEligibleForMode(provider, "AT_HOME", "HADONG", "s2")).toBe(false);
    expect(isEligibleForMode(provider, "AT_HOME", "DAN_PHUONG", "s1")).toBe(false);
    expect(isEligibleForMode(demo, "AT_BRANCH", "", "s1")).toBe(false);
  });
});
