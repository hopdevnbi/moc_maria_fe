import { describe, expect, it } from "vitest";
import demoProfiles from "./demo-ktvs.json";
import { providerOffers } from "./ktv-home";

describe("isolated demonstration KTV seed", () => {
  it("contains ten unique, explicitly nonbookable profiles with safe local avatar paths", () => {
    expect(demoProfiles).toHaveLength(10);
    expect(new Set(demoProfiles.map((item) => item.id)).size).toBe(10);
    expect(new Set(demoProfiles.map((item) => item.avatarUrl)).size).toBe(10);
    for (const item of demoProfiles) {
      expect(item.isDemo).toBe(true);
      expect(item.bookable).toBe(false);
      expect(item.demoServices.length).toBeGreaterThanOrEqual(2);
      expect(item.avatarUrl.startsWith("/media/ktv/")).toBe(true);
    }
  });

  it("configures five working schedules and leaves five unset without enabling reservations", () => {
    expect(demoProfiles.filter((p) => p.scheduleOpen)).toHaveLength(5);
    expect(demoProfiles.filter((p) => !p.scheduleOpen)).toHaveLength(5);
    for (const p of demoProfiles) {
      if (p.scheduleOpen) {
        expect(p.weeklySchedule?.weekdays).toEqual([1, 2, 3, 4, 5, 6]);
        expect(p.weeklySchedule?.startsAt).toBe("09:00");
        expect(p.weeklySchedule?.endsAt).toBe("18:00");
      } else expect(p.weeklySchedule).toBeNull();
    }
  });

  it("shows demo-specific services without minting real provider eligibility policies", () => {
    const provider = demoProfiles[0];
    expect(provider.eligibleServices).toEqual([]);
    const offers = providerOffers(provider, []);
    expect(offers).toHaveLength(provider.demoServices.length);
    expect(offers.every((offer) => offer.price !== null && offer.price >= 0)).toBe(true);
  });
});
