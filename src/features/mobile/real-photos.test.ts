import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import services from "./demo-services.json";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("real service photography manifest", () => {
  it("has 10 CDN photo covers with both mobile and larger responsive variants", () => {
    expect(services).toHaveLength(10);
    for (const item of services) {
      expect(item.imageUrl).toMatch(
        /^https:\/\/giangxa-media-cdn\.b-cdn\.net\/moc-maria\/services\/photos-v1\/[a-z-]+-[a-f0-9]{12}-960\.webp$/,
      );
      expect(item.imageSrcSet).toContain(" 480w, ");
      expect(item.imageSrcSet).toMatch(/960\.webp 960w$/);
      const variants = item.imageSrcSet.split(",").map((s) => s.trim().split(" ")[0]);
      expect(variants).toHaveLength(2);
      for (const url of variants) {
        const file = path.basename(new URL(url).pathname);
        expect(existsSync(path.join(root, "public", "services", "photography", file))).toBe(true);
      }
      expect(item.isDemo).toBe(true);
      expect(item.service.isPublished).toBe(false);
    }
  });
});
