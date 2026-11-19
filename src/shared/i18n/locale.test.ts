import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  localeForCountry,
  normalizeLocale,
  resolveLocale,
} from "./locale";
import { messages } from "./messages";

describe("locale contract", () => {
  it("maps supported countries and defaults unknown countries to Vietnamese", () => {
    for (const [country, expected] of Object.entries({
      VN: "vi",
      US: "en",
      GB: "en",
      KR: "ko",
      JP: "ja",
      CN: "zh-CN",
      RU: "ru",
      FR: "vi",
      ZZ: "vi",
    })) {
      expect(localeForCountry(country)).toBe(expected);
    }
    expect(localeForCountry(undefined)).toBe(DEFAULT_LOCALE);
    expect(localeForCountry("KR,US")).toBe(DEFAULT_LOCALE);
  });
  it("prefers explicit choice then account then country", () => {
    expect(resolveLocale({ manual: "vi", account: "en", country: "KR" })).toBe("vi");
    expect(resolveLocale({ manual: "bad", account: "ru", country: "JP" })).toBe("ru");
    expect(resolveLocale({ country: "jp" })).toBe("ja");
    expect(resolveLocale({})).toBe("vi");
  });
  it("accepts only supported locale identifiers", () => {
    for (const locale of LOCALES) expect(normalizeLocale(locale)).toBe(locale);
    expect(normalizeLocale("ZH-cn")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBeUndefined();
    expect(normalizeLocale(["en"])).toBeUndefined();
  });
  it("has identical nonempty message keys for every locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(messages[locale]).sort()).toEqual(Object.keys(messages.vi).sort());
      expect(Object.values(messages[locale]).every((value) => value.trim().length > 0)).toBe(true);
    }
  });
});
