import { describe, expect, it } from "vitest";
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

  it("rejects credentials and unsupported schemes in a public API URL", () => {
    expect(() => resolveApiBaseUrl("https://user:secret@api.mocmaria.com")).toThrow();
    expect(() => resolveApiBaseUrl("javascript:alert(1)")).toThrow();
  });

  it("can enforce a non-localhost production deployment URL", () => {
    expect(() =>
      resolveApiBaseUrl("http://localhost:3000/api/v1", { enforceProductionHost: true }),
    ).toThrow("NEXT_PUBLIC_API_BASE_URL cannot point to localhost for production deployment.");
  });
});
