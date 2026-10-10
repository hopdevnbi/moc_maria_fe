import profiles from "./demo-ktvs.json";

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const namedProfiles = profiles.map((profile) => ({ ...profile, urlSlug: slugify(profile.publicName) }));

export function providerProfileHref(provider: { id: string; publicName: string; isDemo?: boolean }): string {
  return "/chuyen-vien/" + (provider.isDemo ? namedProfiles.find((item) => item.id === provider.id)?.urlSlug ?? provider.id : provider.id);
}

export function findNamedProfile(segment: string) {
  return namedProfiles.find((item) => item.urlSlug === segment || item.id === segment);
}
