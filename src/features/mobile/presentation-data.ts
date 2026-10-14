import "server-only";
import { publicRead } from "@/features/marketplace/public-api";
import type { Provider } from "@/features/marketplace/types";
import { applyDisplayPolicy, type PublicDisplay } from "@/features/provider-display/display-policy";
export async function approvedDescriptions(providers: Provider[]) {
  const [result, profiles, display] = await Promise.all([
    publicRead<Array<{ providerId: string; introduction: string }>>("/provider-presentation"),
    publicRead<Array<{ providerId: string; age: number }>>("/provider-presentation/profiles"),
    publicRead<PublicDisplay>("/provider-display"),
  ]);
  if (!display.ok) return [];
  return applyDisplayPolicy(
    providers.map((p) => {
      const id = p.chatProviderId || p.id;
      const approved = result.ok ? result.data.find((a) => a.providerId === id) : undefined;
      const profile = profiles.ok ? profiles.data.find((a) => a.providerId === id) : undefined;
      return {
        ...p,
        ...(approved ? { introduction: approved.introduction } : {}),
        ...(profile ? { age: profile.age } : {}),
      };
    }),
    display.data,
  );
}
