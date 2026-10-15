import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { isEventRootRequest } from "./event-host";

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
  it("recognizes only root on the exact Event hostname", () => {
    expect(isEventRootRequest("event.mocmaria.com", "/")).toBe(true);
    expect(isEventRootRequest("event.mocmaria.com:443", "/")).toBe(true);
    expect(isEventRootRequest("mocmaria.com", "/")).toBe(false);
    expect(isEventRootRequest("event.mocmaria.com.evil.tld", "/")).toBe(false);
    expect(isEventRootRequest("event.mocmaria.com", "/dang-nhap")).toBe(false);
    expect(isEventRootRequest(null, "/")).toBe(false);
  });
});
