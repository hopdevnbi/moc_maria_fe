import type { Provider } from "@/features/marketplace/types";
import { careMenu } from "./official-menu";

/**
 * Preserve the demo KTV's existing service selections while displaying the
 * current printed care menu. These are *examples*, not approved skill records.
 * Real KTV eligibility always comes from the backend and must never use this map.
 */
const demoServiceToOfficialIndex: Record<string, number> = {
  "demo-relaxation": 0,
  "demo-hot-stone": 1,
  "demo-neck": 2,
  "demo-foot": 3,
  "demo-herbal": 4,
  "demo-pressure": 5,
  "demo-aroma": 6,
  "demo-thai": 7,
  "demo-back": 8,
  "demo-hair": 9,
};

export function officialDemoKtvOffers(provider: Provider) {
  if (!provider.isDemo) return [];
  return (provider.demoServices ?? []).flatMap((entry) => {
    const index = demoServiceToOfficialIndex[entry.id];
    const item = index === undefined ? undefined : careMenu[index];
    return item
      ? [{ id: item.slug, demoServiceId: entry.id, name: item.name, price: item.priceVnd, duration: null }]
      : [];
  });
}
