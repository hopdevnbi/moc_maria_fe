import { connection } from "next/server";
import { publicProviderDirectory } from "@/features/mobile/data";
import demoServices from "@/features/mobile/demo-services.json";
import type { ServiceItem } from "@/features/marketplace/types";
import {
  inquiryServiceOptions,
  supportsInquiryService,
} from "@/features/mobile/inquiry-service-options";
import { MOC_MARIA_PRIMARY_ADDRESS } from "@/features/mobile/booking-location";
import { resolveApiBaseUrl } from "@/shared/config/environment";
import { officialServiceLabel } from "@/features/mobile/official-ktv-offers";

// Public catalog only. Authentication and bookings keep using the existing API.
export async function GET() {
  await connection();
  const data = await publicProviderDirectory();
  const services = inquiryServiceOptions([...data.services, ...(demoServices as ServiceItem[])]);
  const providers = data.providers
    .filter((p) => p.chatEnabled || !p.isDemo)
    .map((p) => ({
      id: p.chatProviderId || p.id,
      name: p.publicName,
      services: services
        .filter((s) => supportsInquiryService(p, s.service.id, services))
        .map((s) => ({
          id: s.service.id,
          name: officialServiceLabel(s.service).name,
        })),
    }))
    .filter((p) => /^[0-9a-f-]{36}$/i.test(p.id) && p.services.length > 0);
  return Response.json(
    { apiBase: resolveApiBaseUrl(), providers, address: MOC_MARIA_PRIMARY_ADDRESS },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
