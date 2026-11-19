import { describe, expect, it } from "vitest";
import { catalogTranslationPath, validTranslation } from "./catalog-translation";
const id = "12345678-1234-4234-8234-123456789012";
describe("catalog translation contracts", () => {
  it("accepts only UUID, catalog kind and allowlisted locale", () => {
    expect(catalogTranslationPath("service", id, "zh-cn")).toBe(
      "/catalog-translations/service/" + id + "/zh-CN",
    );
    expect(catalogTranslationPath("service", "demo-hair", "en")).toBeNull();
    expect(catalogTranslationPath("../admin", id, "en")).toBeNull();
    expect(catalogTranslationPath("variant", id, "../vi")).toBeNull();
  });
  it("rejects response from a different identity/locale", () => {
    const sample = {
      entityId: id,
      kind: "service",
      requestedLocale: "en",
      locale: "vi",
      name: "Massage chân",
      description: null,
    };
    expect(validTranslation(sample, "service", id, "en")).toBe(true);
    expect(validTranslation(sample, "service", id, "ja")).toBe(false);
    expect(validTranslation({ ...sample, locale: "ru" }, "service", id, "en")).toBe(false);
  });
});
