import { describe, expect, it } from "vitest";
import { vipLabel, vipLevel } from "./vip-level";
describe("VIP numbered badges", () => {
  it("labels existing VIP1 and explicitly assigned levels consistently", () => {
    expect(vipLabel()).toBe("VIP 1");
    expect(vipLabel(3)).toBe("VIP 3");
    expect(vipLabel(99)).toBe("VIP 99");
    expect(vipLevel(0)).toBe(1);
    expect(vipLevel(1.5)).toBe(1);
  });
});
