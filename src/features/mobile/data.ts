import "server-only";
import { publicRead } from "@/features/marketplace/public-api";
import type { Branch, Provider, ServiceItem, ChatProvider } from "@/features/marketplace/types";
import demoProviders from "@/features/mobile/demo-ktvs.json";
import { approvedDescriptions } from "./presentation-data";
import { persistedDirectory } from "./provider-directory";
import { officialKtvProfiles } from "./official-ktv-roster";
import {
  ownerProvidedKtvProfiles,
  pendingOwnerProvidedKtvProfiles,
} from "./owner-provided-ktvs";

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
  const [data, chat] = await Promise.all([
    publicMarketplace(),
    publicRead<ChatProvider[]>("/ktv-chat/providers"),
  ]);
  const accounts = chat.ok ? chat.data : [];
  const published = await approvedDescriptions(
    persistedDirectory(
      data.providers,
      [...officialKtvProfiles(demoProviders as Provider[]), ...ownerProvidedKtvProfiles],
      accounts,
    ),
  );
  return {
    ...data,
    providersUnavailable: data.providersUnavailable || !chat.ok,
    providers: [...published, ...pendingOwnerProvidedKtvProfiles(accounts, published)],
  };
}
