import type { Provider, ServiceItem } from "@/features/marketplace/types";
import { careMenu } from "./official-menu";
import { officialLegacyCareItem } from "./official-ktv-offers";

export function isPublishedInquiryCare(item: ServiceItem): boolean {
  return (
    !item.isDemo &&
    item.service.isPublished &&
    careMenu.some((care) => care.slug === item.service.slug) &&
    item.variants.some((variant) => variant.isActive)
  );
}

export function inquiryServiceOptions(services: ServiceItem[]): ServiceItem[] {
  return services.filter((item) => {
    if (isPublishedInquiryCare(item)) return true;
    const legacy = officialLegacyCareItem(item.service.id);
    return (
      !!legacy &&
      !services.some(
        (candidate) => isPublishedInquiryCare(candidate) && candidate.service.slug === legacy.slug,
      )
    );
  });
}

export function inquiryServiceId(id: string, services: ServiceItem[]): string {
  const legacy = officialLegacyCareItem(id);
  return (
    (legacy &&
      services.find((item) => isPublishedInquiryCare(item) && item.service.slug === legacy.slug)
        ?.service.id) ||
    id
  );
}

// Advisory requests are confirmed by the selected KTV. This is not slot eligibility.
export function supportsInquiryService(
  provider: Provider,
  id: string,
  services: ServiceItem[],
): boolean {
  if (services.some((item) => item.service.id === id && isPublishedInquiryCare(item))) return true;
  return provider.isDemo
    ? !!provider.demoServices?.some((service) => service.id === id)
    : !!provider.eligibleServices?.some((service) => service.serviceId === id);
}
