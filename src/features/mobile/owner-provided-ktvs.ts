import type { ChatProvider, Provider } from "@/features/marketplace/types";

// Owner-supplied information and photo (2026-11-08).
// These profiles are introduction-only until a distinct backend KTV account is provisioned.
// Never infer credentials, verified qualifications, services, shifts, ratings or bookings.
export const ownerProvidedKtvProfiles: Provider[] = [
  {
    id: "ktv-thanh-thanh",
    publicName: "Thanh Thanh",
    introduction:
      "Lực tay khỏe, kỹ năng giải cơ sâu tốt. Nhiệt tình và hiền hòa. Sinh năm 1999.",
    serviceArea: "Hà Nội",
    title: "Kỹ thuật viên giải cơ sâu",
    avatarUrl: "/media/ktv/thanh-thanh-20261108.webp",
    avatarAlt: "Kỹ thuật viên Thanh Thanh đang chăm sóc khách hàng tại Mộc Maria",
    isDemo: true,
    bookable: false,
    chatEnabled: false,
    eligibleServices: [],
    demoServices: [],
    yearsExperience: null,
    scheduleOpen: false,
    weeklySchedule: null,
  },
];

/**
 * Render only the owner's explicitly supplied introductions without an account.
 * Once an account exists, the backend's display/visibility policy owns publication:
 * do not re-add a hidden KTV as a static fallback.
 */
export function pendingOwnerProvidedKtvProfiles(
  accounts: ChatProvider[],
  published: Provider[],
): Provider[] {
  const linkedAliases = new Set(accounts.map((account) => account.publicAlias));
  const existingIds = new Set(published.map((provider) => provider.id));
  return ownerProvidedKtvProfiles.filter(
    (profile) => !linkedAliases.has(profile.id) && !existingIds.has(profile.id),
  );
}
