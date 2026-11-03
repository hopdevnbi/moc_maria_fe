import { resolveApiBaseUrl } from "@/shared/config/environment";

export type NoelPromotion = { id: string; endsAt: string };

/** Public read only. A missing/paused campaign never delays or breaks the directory. */
export async function getNoelPromotion(): Promise<NoelPromotion | null> {
  try {
    const response = await fetch(resolveApiBaseUrl() + "/gift-events/current", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const { campaign } = (await response.json()) as {
      campaign?: { id?: string; title?: string; endAt?: string; effectiveStatus?: string };
    };
    if (
      !campaign?.id ||
      campaign.effectiveStatus !== "LIVE" ||
      !campaign.endAt?.startsWith("2026-") ||
      !Number.isFinite(Date.parse(campaign.endAt)) ||
      !/giáng sinh|noel/i.test(campaign.title ?? "")
    )
      return null;
    return { id: campaign.id, endsAt: campaign.endAt };
  } catch {
    return null;
  }
}
