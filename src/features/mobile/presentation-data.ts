import "server-only";
import { publicRead } from "@/features/marketplace/public-api";
import type { Provider } from "@/features/marketplace/types";
export async function approvedDescriptions(providers: Provider[]) {
  const [result, profiles] = await Promise.all([
    publicRead<Array<{ providerId: string; introduction: string }>>("/provider-presentation"),
    publicRead<Array<{ providerId: string; age: number }>>("/provider-presentation/profiles"),
  ]);
  return providers.map((p) => {
    const id = p.chatProviderId || p.id;
    const approved = result.ok ? result.data.find((a) => a.providerId === id) : undefined;
    const profile = profiles.ok ? profiles.data.find((a) => a.providerId === id) : undefined;
    return {
      ...p,
      ...(approved ? { introduction: approved.introduction } : {}),
      ...(profile ? { age: profile.age } : {}),
    };
  });
}
