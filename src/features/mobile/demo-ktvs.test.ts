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
      expect(
        item.avatarUrl.startsWith("/demo/ktv/") ||
          item.avatarUrl.startsWith("https://giangxa-media-cdn.b-cdn.net/moc-maria/demo-ktv/"),
      ).toBe(true);
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
