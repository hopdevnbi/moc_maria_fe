import "server-only";
import { cacheLife } from "next/cache";
import { publicRead } from "@/features/marketplace/public-api";
import type { Branch, Provider, ServiceItem } from "@/features/marketplace/types";

// Only the public service/branch catalog is cached. Provider approvals and booking slots stay live.
export async function catalogSnapshot() {
  "use cache";
  cacheLife("minutes");
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
