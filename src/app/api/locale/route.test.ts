import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

function request(country: string, cookie?: string) {
  const headers = new Headers({ "x-vercel-ip-country": country });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest("https://mocmaria.com/api/locale", { headers });
}

describe("locale detection API", () => {
  it("defaults to Vietnamese unless trusted geo detection is enabled", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MOC_I18N_GEO", "0");
    expect(await GET(request("KR")).json()).toEqual({ locale: "vi" });
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("MOC_I18N_GEO", "1");
    expect(await GET(request("KR")).json()).toEqual({ locale: "vi" });
  });
  it("uses country hint on enabled Vercel deployments and honors manual preference", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MOC_I18N_GEO", "1");
    const response = GET(request("KR"));
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ locale: "ko" });
    expect(await GET(request("CN", "moc_locale=ja")).json()).toEqual({ locale: "ja" });
    expect(await GET(request("ZZ")).json()).toEqual({ locale: "vi" });
  });
});
