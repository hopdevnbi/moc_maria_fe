import { describe, expect, it } from "vitest";
import { LOCALES } from "./locale";
import { providerTitle, providerTitleSources } from "./provider-titles";
import demoProviders from "@/features/mobile/demo-ktvs.json";
import { officialKtvProfiles } from "@/features/mobile/official-ktv-roster";
import { ownerProvidedKtvProfiles } from "@/features/mobile/owner-provided-ktvs";

describe("provider specialty translations", () => {
  it("covers all eight published roster titles in all six locales", () => {
    const profiles = [...officialKtvProfiles(demoProviders), ...ownerProvidedKtvProfiles];
    expect(profiles).toHaveLength(8);
    expect(providerTitleSources).toHaveLength(8);
    for (const profile of profiles) {
      const title = profile.title!;
      expect(providerTitleSources).toContain(title);
      for (const locale of LOCALES) {
        const localized = providerTitle(locale, title);
        expect(localized).not.toBe("");
        if (locale === "vi") expect(localized).toBe(title);
        else expect(localized).not.toBe(title);
      }
    }
  });
  it("preserves an unknown or newly edited title instead of assuming old qualifications", () => {
    expect(providerTitle("en", "Tiêu đề mới")).toBe("Tiêu đề mới");
    expect(providerTitle("ja", null)).toBe("");
  });
});
