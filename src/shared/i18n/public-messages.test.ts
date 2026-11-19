import { describe, expect, it } from "vitest";
import { LOCALES } from "./locale";
import { translate } from "./messages";
import { homeMessageKeys } from "./home-messages";
import { navMessageKeys } from "./nav-messages";
import { menuMessageKeys } from "./menu-messages";

describe("public message completeness", () => {
  it("provides all six translations with matching interpolation parameters", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of [...homeMessageKeys, ...navMessageKeys, ...menuMessageKeys]) {
      const source = translate("vi", key);
      for (const locale of LOCALES) {
        const result = translate(locale, key);
        expect(result.trim().length).toBeGreaterThan(0);
        expect(placeholders(result)).toEqual(placeholders(source));
      }
    }
  });
});
