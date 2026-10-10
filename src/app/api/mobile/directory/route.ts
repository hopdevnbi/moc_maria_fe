import { publicProviderDirectory } from "@/features/mobile/data";
import demoServices from "@/features/mobile/demo-services.json";
export async function GET() {
  const data = await publicProviderDirectory();
  return Response.json(
    {
      providers: data.providers.map((p) => ({
        id: p.id,
        publicName: p.publicName,
        serviceArea: p.serviceArea,
        services:
          p.demoServices?.map((s) => s.name) || p.eligibleServices?.map((s) => s.serviceName) || [],
      })),
      services: [...data.services, ...demoServices].map((s) => ({
        id: s.service.id,
        name: s.service.name,
        slug: s.service.slug,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
