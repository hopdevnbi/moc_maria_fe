import { describe, expect, it } from "vitest";
import services from "./demo-services.json";
import providers from "./demo-ktvs.json";

describe("demo massage service catalog", () => {
  it("contains ten unique unpublished and nonbookable demo service previews", () => {
    expect(services).toHaveLength(10);
    expect(new Set(services.map((item) => item.service.id)).size).toBe(10);
    expect(new Set(services.map((item) => item.service.slug)).size).toBe(10);
    for (const item of services) {
      expect(item.isDemo).toBe(true);
      expect(item.service.isPublished).toBe(false);
      expect(item.service.slug.endsWith("-demo")).toBe(true);
      expect(
        item.imageUrl.startsWith(
          "https://giangxa-media-cdn.b-cdn.net/moc-maria/services/photos-v1/",
        ),
      ).toBe(true);
      expect(item.variants.length).toBeGreaterThanOrEqual(2);
      expect(item.variants.every((v) => v.isActive && Number(v.priceVnd) > 0)).toBe(true);
    }
  });

  it("references only existing nonbookable KTV previews with matching service offers", () => {
    for (const item of services) {
      expect(item.demoProviderIds.length).toBeGreaterThan(0);
      for (const providerId of item.demoProviderIds) {
        const provider = providers.find((candidate) => candidate.id === providerId);
        expect(provider?.isDemo).toBe(true);
        expect(provider?.bookable).toBe(false);
        const offer = provider?.demoServices.find((service) => service.id === item.service.id);
        expect(offer).toBeDefined();
        expect(
          item.variants.some(
            (variant) =>
              variant.durationMinutes === offer?.durationMinutes &&
              Number(variant.priceVnd) === offer?.priceVnd,
          ),
        ).toBe(true);
      }
    }
  });
});
