import { describe, expect, it } from "vitest";
import { isActiveVip, type CustomerSelfProfile } from "./customer-account-profile";

const profile = (tier: "VIP" | "STANDARD", expiresAt: string | null) =>
  ({
    id: "me",
    displayName: "Nguyễn Hợp",
    email: null,
    phone: null,
    roles: ["CUSTOMER"],
    avatarUploadEnabled: true,
    customer: { id: "c", birthday: null, avatarUrl: null },
    membership: { tier, expiresAt, startedAt: null },
  }) satisfies CustomerSelfProfile;

describe("customer VIP badge eligibility", () => {
  it("shows VIP for an active lifetime or future-expiry VIP membership", () => {
    expect(isActiveVip(profile("VIP", null))).toBe(true);
    expect(isActiveVip(profile("VIP", "2099-01-01T00:00:00Z"))).toBe(true);
  });
  it("never shows the badge for expired or standard memberships", () => {
    expect(isActiveVip(profile("VIP", "2020-01-01T00:00:00Z"))).toBe(false);
    expect(isActiveVip(profile("STANDARD", null))).toBe(false);
    expect(isActiveVip(undefined)).toBe(false);
  });
});
