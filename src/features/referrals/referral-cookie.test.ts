import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeReferralCode,
  readReferralCookie,
  registrationReferral,
  clearReferralCookie,
} from "./referral-cookie";
const code = "0123456789ABCDEFABCD";
afterEach(() => {
  clearReferralCookie();
  localStorage.clear();
  vi.restoreAllMocks();
});
describe("referral attribution", () => {
  it("normalizes only bounded public codes", () => {
    expect(normalizeReferralCode(code.toLowerCase())).toBe(code);
    expect(normalizeReferralCode("not-a-code")).toBeUndefined();
    expect(readReferralCookie("other=1; moc_referral=" + code)).toBe(code);
  });
  it("retains browser signal across registrations without treating it as identity", () => {
    document.cookie = "moc_referral=" + code + "; Path=/";
    const first = registrationReferral(),
      second = registrationReferral();
    expect(first.referralCode).toBe(code);
    expect(first.referralDeviceId).toMatch(/^[a-f0-9-]{36}$/i);
    expect(second).toEqual(first);
    expect(registrationReferral("")).toEqual({});
  });
  it("preserves registration when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(registrationReferral(code)).toEqual({ referralCode: code });
  });
});
