import { afterEach, describe, expect, it, vi } from "vitest";
import { getNoelPromotion } from "./noel-promotion-data";

afterEach(() => vi.unstubAllGlobals());
const campaign = {
  id: "live-noel",
  title: "Mộc Maria - Giáng Sinh An Lành",
  effectiveStatus: "LIVE",
  endAt: "2026-12-25T16:59:59.999Z",
};
describe("public homepage promotion data", () => {
  it("uses a bounded public read and passes only the campaign identity and expiry to the popup", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ campaign: { ...campaign, budgetReservedVnd: 100000 } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await getNoelPromotion()).toEqual({ id: "live-noel", endsAt: campaign.endAt });
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/gift-events/current"),
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });
  it("suppresses paused, ended, unrelated, future-year and malformed campaigns", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const value of [
      null,
      { ...campaign, effectiveStatus: "PAUSED" },
      { ...campaign, effectiveStatus: "ENDED" },
      { ...campaign, title: "Sự kiện khác" },
      { ...campaign, endAt: "2027-12-25T16:59:59Z" },
      { ...campaign, endAt: "invalid" },
    ]) {
      fetcher.mockResolvedValueOnce(Response.json({ campaign: value }));
      expect(await getNoelPromotion()).toBeNull();
    }
  });
  it("fails closed on backend errors without failing the homepage", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    expect(await getNoelPromotion()).toBeNull();
    expect(await getNoelPromotion()).toBeNull();
  });
});
