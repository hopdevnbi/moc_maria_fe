import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicRead } from "./public-api";
import { isPublicCachePath } from "./public-cache-policy";
import { readPublicRevision } from "./public-revision";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("react", async (original) => ({
  ...(await original<object>()),
  cache: (fn: unknown) => fn,
}));

const revision = "a".repeat(24);
const json = (value: unknown, status = 200, token?: string) =>
  new Response(JSON.stringify(value), {
    status,
    headers: token ? { "x-public-revision": token } : {},
  });
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("PUBLIC_CONTENT_CACHE_ENABLED", "true");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("public cache boundary", () => {
  it("uses an authoritative revision and never forwards credentials", async () => {
    fetcher.mockResolvedValueOnce(json({ revision, enabled: true }));
    fetcher.mockResolvedValueOnce(json([{ id: "service" }], 200, revision));
    expect(await publicRead("/services")).toEqual({ ok: true, data: [{ id: "service" }] });
    expect(fetcher.mock.calls[0][0]).toMatch(/\/public-content\/revision$/);
    for (const [, init] of fetcher.mock.calls) {
      expect(init.cache).toBe("no-store");
      expect(init.credentials).toBe("omit");
      expect(init.headers).toEqual({ Accept: "application/json" });
    }
  });
  it("bypasses revision/data caching for availability, tips and unrecognized paths", async () => {
    for (const path of [
      "/providers",
      "/ktv-chat/providers",
      "/provider-tips/id/config",
      "/services?x=1",
      "/admin/services",
    ]) {
      expect(isPublicCachePath(path)).toBe(false);
      fetcher.mockResolvedValueOnce(json({ live: true }));
      expect(await publicRead(path)).toEqual({ ok: true, data: { live: true } });
    }
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it("falls back live on a failed gate or a backend with the feature disabled", async () => {
    for (const gate of [
      json({}, 503),
      json({ revision, enabled: false }),
      json({ revision: "bad", enabled: true }),
    ]) {
      fetcher.mockResolvedValueOnce(gate).mockResolvedValueOnce(json(["live"]));
      expect(await publicRead("/services")).toEqual({ ok: true, data: ["live"] });
    }
  });
  it("rejects a mismatched fill and preserves real errors on the live fallback", async () => {
    fetcher.mockResolvedValueOnce(json({ revision, enabled: true }));
    fetcher.mockResolvedValueOnce(json(["old"], 200, "b".repeat(24)));
    fetcher.mockResolvedValueOnce(json({ message: "missing" }, 404));
    expect(await publicRead("/services")).toEqual({ ok: false, status: 404 });
  });
  it("does not convert gate errors into a successful empty revision", async () => {
    fetcher.mockRejectedValueOnce(new Error("offline"));
    expect(await readPublicRevision()).toBeNull();
  });
  it("supports a flag-off rollback without requiring the new backend", async () => {
    vi.stubEnv("PUBLIC_CONTENT_CACHE_ENABLED", "false");
    fetcher.mockResolvedValueOnce(json(["live"]));
    expect(await publicRead("/services")).toEqual({ ok: true, data: ["live"] });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
