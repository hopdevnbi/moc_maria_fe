import "server-only";
import { publicRead } from "@/features/marketplace/public-api";
import type { Branch, Provider, ServiceItem } from "@/features/marketplace/types";
import demoProviders from "@/features/mobile/demo-ktvs.json";

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
  const data = await publicMarketplace();
  return { ...data, providers: [...data.providers, ...(demoProviders as Provider[])] };
}
