import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { publicRead } from "@/features/marketplace/public-api";
import type { Provider, ChatProvider } from "@/features/marketplace/types";
import { DemoKtvDetail } from "@/features/mobile/demo-detail";
import { findNamedProfile } from "@/features/mobile/provider-slugs";
import { ownerProvidedKtvProfiles } from "@/features/mobile/owner-provided-ktvs";
import { ownerProvidedKtvShowcase } from "@/features/mobile/owner-provided-ktv-showcase";
import { approvedDescriptions } from "@/features/mobile/presentation-data";
import { KtvPublicDetail } from "@/features/mobile/ktv-showcase";
import type { KtvShowcase } from "@/features/mobile/ktv-showcase-types";
import { EMPTY_KTV_SHOWCASE } from "@/features/mobile/ktv-showcase-types";

export const metadata: Metadata = {
  title: "Hồ sơ kỹ thuật viên | Mộc Maria",
  description:
    "Tìm hiểu kỹ thuật viên, dịch vụ, hình ảnh, video và thời gian chăm sóc tại Mộc Maria.",
};

async function showcaseFor(providerId: string): Promise<KtvShowcase> {
  const result = await publicRead<KtvShowcase>(
    "/provider-showcase/" + encodeURIComponent(providerId),
  );
  return result.ok ? result.data : EMPTY_KTV_SHOWCASE;
}

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const named = findNamedProfile(id);
  if (named) {
    if (id !== named.urlSlug) permanentRedirect("/chuyen-vien/" + named.urlSlug);
    const chat = await publicRead<ChatProvider[]>("/ktv-chat/providers");
    const receiver = chat.ok
      ? chat.data.find((provider) => provider.publicAlias === named.id)
      : undefined;
    if (!receiver) {
      // Owner-supplied introduction: never borrow another KTV's chat identity.
      if (!ownerProvidedKtvProfiles.some((profile) => profile.id === named.id)) notFound();
      return (
        <DemoKtvDetail
          provider={{ ...named, chatEnabled: false, bookable: false }}
          showcase={ownerProvidedKtvShowcase(named.id) ?? undefined}
        />
      );
    }

    const [profile, showcase] = await Promise.all([
      approvedDescriptions([
        {
          ...named,
          publicName: receiver.publicName,
          serviceArea: receiver.serviceArea,
          avatarUrl: receiver.avatarUrl ?? named.avatarUrl,
          scheduleOpen: false,
          weeklySchedule: null,
          chatProviderId: receiver.id,
          chatEnabled: true,
        },
      ]),
      showcaseFor(receiver.id),
    ]);
    if (!profile[0]) notFound();
    return <DemoKtvDetail provider={profile[0]} showcase={showcase} />;
  }

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await publicRead<Provider>("/providers/" + encodeURIComponent(id));
  if (!result.ok && result.status === 404) notFound();
  const [profiles, showcase] = await Promise.all([
    result.ok ? approvedDescriptions([result.data]) : Promise.resolve([]),
    result.ok ? showcaseFor(id) : Promise.resolve(EMPTY_KTV_SHOWCASE),
  ]);
  const provider = profiles[0];
  if (result.ok && !provider) notFound();
  if (!provider) {
    return (
      <main className="mm-container" role="alert">
        Chưa tải được hồ sơ kỹ thuật viên. Vui lòng thử lại.
      </main>
    );
  }
  const offers = Array.from(
    new Map(
      (provider.eligibleServices ?? [])
        .filter((service) => service.mode === "ON_SITE")
        .map((service) => [
          service.policyId,
          {
            id: service.policyId,
            name: service.serviceName,
            branchName: service.branchName,
            bookingServiceId: service.serviceId,
          },
        ]),
    ).values(),
  );
  return (
    <KtvPublicDetail
      provider={provider}
      profileId={provider.id}
      offers={offers}
      showcase={showcase}
    />
  );
}
