import "server-only";
import { publicRead } from "@/features/marketplace/public-api";
import type { Provider } from "@/features/marketplace/types";
export async function approvedDescriptions(providers: Provider[]) {
  const result =
    await publicRead<Array<{ providerId: string; introduction: string }>>("/provider-presentation");
  if (!result.ok) return providers;
  return providers.map((p) => {
    const approved = result.data.find((a) => a.providerId === (p.chatProviderId || p.id));
    return approved ? { ...p, introduction: approved.introduction } : p;
  });
}
