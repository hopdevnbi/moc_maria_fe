import { expect, it, vi } from "vitest";
import { GET } from "./route";
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/shared/release/version", () => ({ APP_RELEASE: "a".repeat(40) }));
it("exposes the deployed build version without caching in browsers or shared CDNs", async () => {
  const response = await GET();
  expect(await response.json()).toEqual({ version: "a".repeat(40) });
  for (const name of ["Cache-Control", "CDN-Cache-Control", "Vercel-CDN-Cache-Control"]) {
    expect(response.headers.get(name)).toContain("no-store");
  }
});
