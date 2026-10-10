import type { Branch, Provider } from "@/features/marketplace/types";
export type BookingLocationMode = "AT_BRANCH" | "AT_HOME";
export const MOC_MARIA_PRIMARY_ADDRESS =
  "Ô 12, LK2, KĐT Tân Tây Đô, Tân Lập, Đan Phương, Hà Nội, Việt Nam, 100000";
export const MOC_MARIA_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(MOC_MARIA_PRIMARY_ADDRESS);
export function isPrimaryBranch(branch: Branch) {
  const address = branch.address
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
  return address.includes("tan tay do") && (address.includes("lk2") || address.includes("lo 2"));
}
export function homeTerritories(providers: Provider[]) {
  const unique = new Map<string, string>();
  for (const provider of providers) {
    if (provider.isDemo || provider.bookable === false) continue;
    for (const policy of provider.eligibleServices ?? []) {
      if (policy.mode !== "AT_HOME" || !policy.jurisdictionCode) continue;
      unique.set(policy.jurisdictionCode, policy.territoryLabel || policy.jurisdictionCode);
    }
  }
  return [...unique]
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}
export function isEligibleForMode(
  provider: Provider,
  mode: BookingLocationMode,
  jurisdictionCode: string,
  serviceId?: string,
): boolean {
  if (provider.isDemo || provider.bookable === false) return false;
  if (mode === "AT_HOME" && !jurisdictionCode) return false;
  return (provider.eligibleServices ?? []).some(
    (policy) =>
      policy.mode === (mode === "AT_BRANCH" ? "ON_SITE" : "AT_HOME") &&
      (mode === "AT_BRANCH" || policy.jurisdictionCode === jurisdictionCode) &&
      (!serviceId || policy.serviceId === serviceId),
  );
}
