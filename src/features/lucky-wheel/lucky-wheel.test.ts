// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { nextWheelRotation, resultColor, verifyWheelProof } from "./lucky-wheel";

describe("wheel presentation and proof contract", () => {
  it("lands every number under the fixed pointer after at least five turns", () => {
    let angle = 0;
    for (const number of [0, 14, 1, 7, 7, 0, 12]) {
      const next = nextWheelRotation(angle, number);
      expect(next - angle).toBeGreaterThanOrEqual(1800);
      expect((next + number * 24) % 360).toBe(0);
      angle = next;
    }
    expect(
      Array.from({ length: 15 }, (_, i) => resultColor(i)).filter((c) => c === "RED"),
    ).toHaveLength(7);
    expect(resultColor(0)).toBe("GREEN");
    expect(() => resultColor(15)).toThrow();
  });
  it("checks the salted server commitment and rejects changed result, tenant and nonce", async () => {
    const org = "99999999-9999-4999-8999-999999999999";
    const r = {
      id: "11111111-1111-4111-8111-111111111111",
      opensAt: "2026-11-17T00:00:00.000Z",
      number: 14,
      nonce: "ab".repeat(32),
      commitment: "",
    };
    r.commitment = createHash("sha256")
      .update(JSON.stringify(["moc-maria", "wheel-v1", org, r.id, r.opensAt, r.number, r.nonce]))
      .digest("hex");
    expect(await verifyWheelProof(org, r)).toBe(true);
    expect(await verifyWheelProof(org, { ...r, opensAt: "2026-11-17T07:00:00+07:00" })).toBe(true);
    expect(await verifyWheelProof(org, { ...r, number: 0 })).toBe(false);
    expect(await verifyWheelProof(org, { ...r, nonce: "cd".repeat(32) })).toBe(false);
    expect(await verifyWheelProof("other", r)).toBe(false);
  });
});
