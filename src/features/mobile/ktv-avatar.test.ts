import { describe, expect, it } from "vitest";
import { ktvAvatarUrl } from "./ktv-avatar";
import { officialKtvProfiles } from "./official-ktv-roster";
import demoProfiles from "./demo-ktvs.json";

describe("KTV avatar sources", () => {
  it("accepts all seven uploaded CDN portraits on the homepage", () => {
    const staff = officialKtvProfiles(demoProfiles);
    expect(staff).toHaveLength(7);
    staff.forEach((profile) => {
      expect(ktvAvatarUrl(profile.avatarUrl, true)).toBe(profile.avatarUrl);
    });
  });

  it("rejects untrusted images and still allows legacy assets", () => {
    expect(ktvAvatarUrl("/media/ktv/demo-ktv-01-care.webp", true)).toBeTruthy();
    expect(ktvAvatarUrl("/demo/ktv/photo.webp", true)).toBeTruthy();
    expect(
      ktvAvatarUrl("https://giangxa-media-cdn.b-cdn.net/moc-maria/demo-ktv/abc.webp", true),
    ).toBeTruthy();
    expect(ktvAvatarUrl("https://example.com/photo.jpg", true)).toBeNull();
    expect(
      ktvAvatarUrl("https://giangxa-media-cdn.b-cdn.net/moc-maria/ktv/../secret.jpg", true),
    ).toBeNull();
  });
});
