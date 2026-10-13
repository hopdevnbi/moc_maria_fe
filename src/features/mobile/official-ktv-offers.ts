import type { Provider } from "@/features/marketplace/types";
import { careMenu } from "./official-menu";

/**
 * Preserve existing legacy selections while displaying the current care menu.
 * Real KTV eligibility always comes from the backend and must never use this map.
 */
const legacyServiceToOfficialSlug: Record<string, string> = {
  "demo-relaxation": "cham-soc-co-vai-gay-chuyen-sau",
  "demo-hot-stone": "cham-soc-co-vai-gay-lung-eo",
  "demo-neck": "massage-chan",
  "demo-foot": "massage-body",
  "demo-herbal": "massage-bau",
  "demo-pressure": "cham-soc-giai-cam",
  "demo-aroma": "combo-giac-hoi-ngai-cuu",
  "demo-thai": "cham-soc-giac-ngu",
  "demo-back": "cham-soc-vung-dau",
  "demo-hair": "goi-dau-sach",
};

export function officialLegacyCareItem(id: string) {
  const slug = legacyServiceToOfficialSlug[id];
  return slug ? careMenu.find((item) => item.slug === slug) : undefined;
}

export function officialServiceLabel<T extends { id: string; name: string }>(entry: T): T {
  const item = officialLegacyCareItem(entry.id);
  return item ? { ...entry, name: item.name } : entry;
}

export function officialDemoKtvOffers(provider: Provider) {
  if (!provider.isDemo) return [];
  return (provider.demoServices ?? []).flatMap((entry) => {
    const item = officialLegacyCareItem(entry.id);
    return item
      ? [
          {
            id: item.slug,
            demoServiceId: entry.id,
            name: item.name,
            price: item.priceVnd,
            duration: null,
          },
        ]
      : [];
  });
}
