import { describe, it, expect } from "vitest";
import {
  cleanPublicQuery,
  internalProviderParam,
  internalServiceParam,
  internalVariantParam,
  publicServiceSlug,
} from "./public-route-ids";
import { bookingHref, chatHref } from "./links";
import services from "./demo-services.json";
describe("Public URLs retain identity without demo text", () => {
  it("converts legacy booking links and preserves service, variant and extra query values", () => {
    const q = {
      provider: "demo-ktv-01",
      service: "demo-neck",
      variant: "demo-neck-45",
      flow: "verified",
      extra: ["a", "b"],
    };
    const clean = cleanPublicQuery(q)!;
    expect(clean).not.toContain("demo");
    const parsed = new URLSearchParams(clean);
    expect(parsed.get("provider")).toBe("linh-anh");
    expect(parsed.getAll("extra")).toEqual(["a", "b"]);
    expect(internalProviderParam(parsed.get("provider")!)).toBe(q.provider);
    expect(internalServiceParam(parsed.get("service")!)).toBe(q.service);
    expect(internalVariantParam(parsed.get("variant")!)).toBe(q.variant);
    expect(cleanPublicQuery({ provider: "linh-anh", service: "massage-co-vai-gay" })).toBeNull();
  });
  it("builds clean booking/chat links for seeded providers and services", () => {
    expect(bookingHref({ provider: "demo-ktv-01" })).toBe("/dat-lich?provider=linh-anh");
    expect(chatHref("demo-ktv-04", "demo-neck")).toBe(
      "/tin-nhan?provider=bao-ngoc&service=massage-co-vai-gay",
    );
    for (const s of services) {
      const href = bookingHref({
        provider: "demo-ktv-01",
        service: s.service.id,
        variant: s.variants[0].id,
      });
      expect(href).not.toContain("demo");
      expect(publicServiceSlug(s.service.slug)).not.toContain("demo");
    }
  });
  it("keeps real provider/service UUIDs and arbitrary ordinary parameters unchanged", () => {
    const id = "b4b40341-6c4f-4cdf-b61f-bf4e497d52c7";
    expect(internalProviderParam(id)).toBe(id);
    expect(internalServiceParam(id)).toBe(id);
    expect(cleanPublicQuery({ provider: id, service: id })).toBeNull();
  });
});
