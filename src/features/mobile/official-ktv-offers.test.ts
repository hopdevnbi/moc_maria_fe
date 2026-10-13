import { describe, expect, it } from "vitest";
import demoProviders from "./demo-ktvs.json";
import { careMenu, drinkMenu } from "./official-menu";
import {
  officialDemoKtvOffers,
  officialLegacyCareItem,
  officialServiceLabel,
} from "./official-ktv-offers";

describe("KTV demo skill mapping to official care menu", () => {
  it("resolves stable menu slugs and preserves legacy IDs and unrelated catalog services", () => {
    expect(officialLegacyCareItem("demo-hair")).toMatchObject({
      name: "Gội đầu sạch",
      priceVnd: 49000,
    });
    expect(officialLegacyCareItem("demo-neck")).toMatchObject({
      name: "Massage chân",
      priceVnd: 159000,
    });
    expect(officialServiceLabel({ id: "demo-hair", name: "old" })).toEqual({
      id: "demo-hair",
      name: "Gội đầu sạch",
    });
    const actual = { id: "actual-catalog-id", name: "Dịch vụ riêng" };
    expect(officialServiceLabel(actual)).toBe(actual);
    expect(officialLegacyCareItem("unknown")).toBeUndefined();
  });
  it("maps each sample KTV's existing selection without inventing durations", () => {
    for (const provider of demoProviders) {
      const offers = officialDemoKtvOffers(provider);
      expect(offers).toHaveLength(provider.demoServices.length);
      expect(new Set(offers.map((offer) => offer.id)).size).toBe(offers.length);
      for (const offer of offers) {
        const careItem = careMenu.find((item) => item.slug === offer.id);
        expect(careItem).toBeDefined();
        expect(offer.name).toBe(careItem?.name);
        expect(offer.price).toBe(careItem?.priceVnd);
        expect(offer.duration).toBeNull();
      }
    }
  });

  it("covers ten care services and never includes drinks", () => {
    const allOffers = demoProviders.flatMap(officialDemoKtvOffers);
    const careIds = new Set(careMenu.map((item) => item.slug));
    const drinkIds = new Set(drinkMenu.flatMap((group) => group.items.map((item) => item.slug)));
    expect(new Set(allOffers.map((item) => item.id))).toEqual(careIds);
    expect(allOffers.every((item) => !drinkIds.has(item.id))).toBe(true);
  });

  it("never assigns the demo skills to a real provider", () => {
    expect(officialDemoKtvOffers({ ...demoProviders[0], isDemo: false })).toEqual([]);
  });
});
