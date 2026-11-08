import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChatProvider, Provider } from "@/features/marketplace/types";
import { ktvAvatarUrl } from "./ktv-avatar";
import { findNamedProfile, providerProfileHref } from "./provider-slugs";
import {
  ownerProvidedKtvProfiles,
  pendingOwnerProvidedKtvProfiles,
} from "./owner-provided-ktvs";

describe("Owner-provided KTV Thanh Thanh", () => {
  const [profile] = ownerProvidedKtvProfiles;

  it("uses the owner's details and only the supplied birth year", () => {
    expect(profile).toMatchObject({
      id: "ktv-thanh-thanh",
      publicName: "Thanh Thanh",
      title: "Kỹ thuật viên giải cơ sâu",
      serviceArea: "Hà Nội",
      bookable: false,
      chatEnabled: false,
      isDemo: true,
      scheduleOpen: false,
      yearsExperience: null,
    });
    expect(profile.introduction).toContain("Sinh năm 1999");
    expect(profile.introduction).toContain("Lực tay khỏe");
    expect(profile.introduction).toContain("giải cơ sâu");
    expect(profile.age).toBeUndefined();
    expect(profile.demoServices).toEqual([]);
    expect(profile.eligibleServices).toEqual([]);
  });

  it("has a valid site-owned image and named profile URL", () => {
    expect(ktvAvatarUrl(profile.avatarUrl, true)).toBe(profile.avatarUrl);
    expect(
      existsSync(resolve(process.cwd(), "public/media/ktv/thanh-thanh-20261108.webp")),
    ).toBe(true);
    expect(providerProfileHref(profile)).toBe("/chuyen-vien/thanh-thanh");
    expect(findNamedProfile("thanh-thanh")?.id).toBe(profile.id);
  });

  it("only shows the introduction while its own backend identity is absent", () => {
    expect(pendingOwnerProvidedKtvProfiles([], [])).toEqual(ownerProvidedKtvProfiles);
    const linked = [
      {
        id: "a-real-application-id",
        publicAlias: profile.id,
        publicName: profile.publicName,
        title: profile.title!,
        serviceArea: profile.serviceArea,
        avatarUrl: profile.avatarUrl,
        services: [],
      },
    ] satisfies ChatProvider[];
    expect(pendingOwnerProvidedKtvProfiles(linked, [])).toEqual([]);
    expect(pendingOwnerProvidedKtvProfiles([], [profile as Provider])).toEqual([]);
  });
});
