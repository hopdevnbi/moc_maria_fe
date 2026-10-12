import { describe, expect, it } from "vitest";
import { careMenu, drinkMenu } from "./official-menu";

describe("official Mộc Maria menu", () => {
  it("preserves ten care services and their printed prices", () => {
    expect(careMenu.map((item) => item.priceVnd)).toEqual([
      249000, 299000, 159000, 349000, 349000, 299000, 159000, 299000, 299000, 49000,
    ]);
  });

  it("has 8 teas, 6 juices, 7 detox drinks with the printed prices", () => {
    expect(drinkMenu.map((section) => section.items.length)).toEqual([8, 6, 7]);
    expect(drinkMenu[0].items.every((item) => item.priceVnd === 69000)).toBe(true);
    expect(drinkMenu[1].items.every((item) => item.priceVnd === 30000)).toBe(true);
    expect(drinkMenu[2].items.map((item) => item.priceVnd)).toEqual([
      35000, 35000, 35000, 35000, 35000, 39000, 49000,
    ]);
  });

  it("uses unique public slugs across all 31 menu entries", () => {
    const all = [...careMenu, ...drinkMenu.flatMap((section) => section.items)];
    expect(all).toHaveLength(31);
    expect(new Set(all.map((item) => item.slug)).size).toBe(31);
    expect(all.every((item) => item.priceVnd > 0)).toBe(true);
  });
});
