import type { Provider } from "@/features/marketplace/types";

export type DisplayVisibility = "VISIBLE" | "HIDDEN" | "ARCHIVED";
export interface DisplayRow {
  id: string;
  publicName: string;
  serviceArea: string | null;
  introduction: string | null;
  title: string | null;
  age: number | null;
  yearsExperience: number | null;
  avatarUrl: string | null;
  alias: string | null;
  applicationStatus: string;
  accountActive: boolean;
  publishable: boolean;
  visibility: DisplayVisibility;
}
export interface DisplaySnapshot {
  version: number;
  rows: DisplayRow[];
}
export interface PublicDisplay {
  version: number;
  rows: Array<{
    providerId: string;
    visible: boolean;
    position?: number;
    publicName?: string;
    serviceArea?: string | null;
    introduction?: string;
    title?: string | null;
    age?: number | null;
    yearsExperience?: number | null;
  }>;
}

export function applyDisplayPolicy(providers: Provider[], display: PublicDisplay): Provider[] {
  const policy = new Map(display.rows.map((row) => [row.providerId, row]));
  return providers
    .flatMap((provider) => {
      const row = policy.get(provider.chatProviderId || provider.id);
      if (!row?.visible) return [];
      return [
        {
          ...provider,
          publicName: row.publicName ?? provider.publicName,
          serviceArea: row.serviceArea === undefined ? provider.serviceArea : row.serviceArea,
          ...(row.introduction === undefined ? {} : { introduction: row.introduction }),
          title: row.title || provider.title,
          ...(row.age === undefined ? {} : { age: row.age ?? undefined }),
          yearsExperience:
            row.yearsExperience === undefined ? provider.yearsExperience : row.yearsExperience,
        },
      ];
    })
    .sort(
      (a, b) =>
        (policy.get(a.chatProviderId || a.id)?.position ?? 0) -
        (policy.get(b.chatProviderId || b.id)?.position ?? 0),
    );
}

export function moveProvider(ids: string[], id: string, position: number): string[] {
  const remaining = ids.filter((value) => value !== id);
  if (!ids.includes(id)) return ids;
  remaining.splice(Math.max(0, Math.min(remaining.length, position - 1)), 0, id);
  return remaining;
}
