import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { publicRead } from "@/features/marketplace/public-api";
import type { Branch, Provider, ServiceItem } from "@/features/marketplace/types";

function stable<T extends { id: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

export async function GET() {
  const [services, providers, branches] = await Promise.all([
    publicRead<ServiceItem[]>("/services"),
    publicRead<Provider[]>("/providers"),
    publicRead<Branch[]>("/branches"),
  ]);
  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (!services.ok || !providers.ok || !branches.ok)
    return NextResponse.json({ error: "Public catalog unavailable" }, { status: 503, headers });
  const normalized = {
    services: stable(
      services.data.map((entry) => ({
        ...entry,
        id: entry.service.id,
        variants: stable(entry.variants),
      })),
    ),
    providers: stable(
      providers.data.map((provider) => ({
        ...provider,
        eligibleServices: [...(provider.eligibleServices ?? [])].sort((a, b) =>
          (a.policyId || a.serviceId).localeCompare(b.policyId || b.serviceId),
        ),
      })),
    ),
    branches: stable(branches.data),
  };
  const revision = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")
    .slice(0, 24);
  return NextResponse.json({ revision }, { headers });
}
