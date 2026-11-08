import { describe, expect, it } from "vitest";
import { findNamedProfile, namedProfiles, providerProfileHref } from "./provider-slugs";

describe("named provider profile URLs", () => {
  it("creates unique Vietnamese-name URLs without demo identifiers", () => {
    expect(namedProfiles).toHaveLength(8);
    expect(namedProfiles.filter((p) => p.id.startsWith("demo-ktv-"))).toHaveLength(7);
    expect(findNamedProfile("thanh-thanh")?.id).toBe("ktv-thanh-thanh");
    expect(new Set(namedProfiles.map((p) => p.urlSlug)).size).toBe(8);
    expect(namedProfiles[0].urlSlug).toBe("nguyet-nguyen");
    expect(findNamedProfile("linh-anh")?.urlSlug).toBe("nguyet-nguyen");
    for (const profile of namedProfiles) {
      expect(providerProfileHref(profile)).toBe(`/chuyen-vien/${profile.urlSlug}`);
      expect(findNamedProfile(profile.urlSlug)?.id).toBe(profile.id);
      expect(findNamedProfile(profile.id)?.urlSlug).toBe(profile.urlSlug);
      expect(profile.urlSlug).not.toContain("demo");
    }
  });
  it("keeps actual provider identifiers unchanged", () => {
    expect(providerProfileHref({ id: "real-uuid", publicName: "Linh Anh" })).toBe(
      "/chuyen-vien/real-uuid",
    );
  });
});
