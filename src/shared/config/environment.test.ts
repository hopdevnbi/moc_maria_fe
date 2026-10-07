import { describe, expect, it, vi } from "vitest";
import { resolveApiBaseUrl } from "./environment";

describe("resolveApiBaseUrl", () => {
  it("normalizes a configured API URL", () => {
    expect(resolveApiBaseUrl("https://api.mocmaria.com/api/v1/")).toBe(
      "https://api.mocmaria.com/api/v1",
    );
  });

  it("rejects malformed values", () => {
    expect(() => resolveApiBaseUrl("not-a-url")).toThrow(
      "NEXT_PUBLIC_API_BASE_URL must be an absolute URL.",
    );
  });

  it("rejects localhost for production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => resolveApiBaseUrl("http://localhost:3000/api/v1")).toThrow(
      "NEXT_PUBLIC_API_BASE_URL cannot point to localhost in production.",
    );
    vi.unstubAllEnvs();
  });
});
