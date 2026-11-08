import "server-only";
import { publicRead } from "@/features/marketplace/public-api";
import type { Branch, Provider, ServiceItem, ChatProvider } from "@/features/marketplace/types";
import demoProviders from "@/features/mobile/demo-ktvs.json";
import { approvedDescriptions } from "./presentation-data";
import { persistedDirectory } from "./provider-directory";
import { officialKtvProfiles } from "./official-ktv-roster";
import { ownerProvidedKtvProfiles, pendingOwnerProvidedKtvProfiles } from "./owner-provided-ktvs";
import type { PublicDisplay } from "@/features/provider-display/display-policy";

// Only the public service/branch catalog is cached. Provider approvals and booking slots stay live.
export async function catalogSnapshot() {
  const [services, branches] = await Promise.all([
    publicRead<ServiceItem[]>("/services"),
    publicRead<Branch[]>("/branches"),
  ]);
  return {
    services: services.ok ? services.data : [],
    branches: branches.ok ? branches.data : [],
    catalogUnavailable: !services.ok,
  };
}

export async function publicMarketplace() {
  const [catalog, providers] = await Promise.all([
    catalogSnapshot(),
    publicRead<Provider[]>("/providers"),
  ]);
  return {
    ...catalog,
    providers: providers.ok ? providers.data : [],
    providersUnavailable: !providers.ok,
  };
}

// One provider directory for both public entry points. Never mix demos with bookings.
export async function publicProviderDirectory() {
  const [data, chat, display] = await Promise.all([
    publicMarketplace(),
    publicRead<ChatProvider[]>("/ktv-chat/providers"),
    publicRead<PublicDisplay>("/provider-display"),
  ]);
  const accounts = chat.ok ? chat.data : [];
  const published = await approvedDescriptions(
    persistedDirectory(
      data.providers,
      [...officialKtvProfiles(demoProviders as Provider[]), ...ownerProvidedKtvProfiles],
      accounts,
    ),
  );
  const allowed = new Map(
    (display.ok ? display.data.rows : [])
      .filter((row) => row.visible)
      .map((row) => [row.providerId, row]),
  );
  // The Admin's explicit hide/archival setting wins over the static profile
  // roster once an actual KTV account has been linked to that presentation.
  const publishedVisible = display.ok
    ? published.filter((profile) => {
        const receiverId = profile.chatProviderId || profile.id;
        const row = display.data.rows.find((item) => item.providerId === receiverId);
        return row?.visible !== false;
      })
    : published;
  const listedIds = new Set(
    publishedVisible.map((profile) => profile.chatProviderId || profile.id),
  );
  const dynamicallyCreated: Provider[] = accounts
    .filter((account) => !listedIds.has(account.id) && allowed.has(account.id))
    .map((account) => {
      const entry = allowed.get(account.id)!;
      return {
        id: account.id,
        chatProviderId: account.id,
        chatEnabled: true,
        isDemo: true,
        bookable: false,
        publicName: entry.publicName || account.publicName,
        introduction: entry.introduction ?? null,
        title: entry.title || account.title,
        serviceArea: entry.serviceArea ?? account.serviceArea,
        avatarUrl: account.avatarUrl,
        age: entry.age ?? undefined,
        yearsExperience: entry.yearsExperience ?? null,
        demoServices: account.services.map((service) => ({
          ...service,
          durationMinutes: 0,
          priceVnd: 0,
        })),
        scheduleOpen: false,
        weeklySchedule: null,
      };
    });
  return {
    ...data,
    providersUnavailable: data.providersUnavailable || !chat.ok,
    providers: [
      ...publishedVisible,
      ...dynamicallyCreated,
      ...pendingOwnerProvidedKtvProfiles(accounts, [...publishedVisible, ...dynamicallyCreated]),
    ],
  };
}
