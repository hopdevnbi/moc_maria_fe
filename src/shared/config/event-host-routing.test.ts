import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("P16 subdomain host isolation", () => {
  it("rewrites only root of the event host to the landing page", async () => {
    const rewritten = await nextConfig.rewrites?.();
    expect(rewritten).toEqual([
      {
        source: "/",
        has: [{ type: "host", value: "event.mocmaria.com" }],
        destination: "/event",
      },
    ]);
  });

  it("keeps the existing security and build feature flags", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.cacheComponents).toBe(true);
    expect(nextConfig.partialPrefetching).toBe(true);
  });
});
