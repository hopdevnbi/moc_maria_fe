import { describe, expect, it, vi } from "vitest";
import { customerCheckInDeviceId } from "./customer-device";

const uuidA = "a4facc87-9375-43f4-a5dc-6f879b7ab069";
const uuidB = "b59c7aa8-fc71-4284-9693-21a482611b33";

describe("customer browser check-in identifier", () => {
  it("reuses the same UUID on the same browser, including different accounts", () => {
    const map = new Map<string, string>();
    const store = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };
    const random = vi.fn().mockReturnValue(uuidA);
    expect(customerCheckInDeviceId(store, random)).toBe(uuidA);
    expect(customerCheckInDeviceId(store, random)).toBe(uuidA);
    expect(random).toHaveBeenCalledTimes(1);
  });
  it("replaces an invalid legacy identifier with a new secure UUID", () => {
    const map = new Map<string, string>([["mocmaria.customer-checkin.device.v1", "bad-device"]]);
    const store = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };
    expect(customerCheckInDeviceId(store, () => uuidB)).toBe(uuidB);
  });
});
