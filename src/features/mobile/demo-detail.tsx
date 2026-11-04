import type { Provider } from "@/features/marketplace/types";
import { officialDemoKtvOffers } from "./official-ktv-offers";
import { KtvPublicDetail } from "./ktv-showcase";
import type { KtvShowcase } from "./ktv-showcase-types";

/** Keeps existing named-KTV routes and official service pricing intact. */
export function DemoKtvDetail({
  provider,
  showcase,
}: {
  provider: Provider;
  showcase?: KtvShowcase;
}) {
  const offers = officialDemoKtvOffers(provider).map((offer) => ({
    id: offer.id,
    name: offer.name,
    price: offer.price,
    consultationServiceId: offer.demoServiceId,
  }));
  return (
    <KtvPublicDetail
      provider={provider}
      profileId={provider.chatProviderId ?? provider.id}
      offers={offers}
      showcase={showcase}
    />
  );
}
