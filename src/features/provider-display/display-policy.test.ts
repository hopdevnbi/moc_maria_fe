import { describe, expect, it } from "vitest";
import type { Provider } from "@/features/marketplace/types";
import { applyDisplayPolicy, moveProvider } from "./display-policy";

const providers = [
  {
    id: "old-alias",
    chatProviderId: "a",
    publicName: "A",
    age: 24,
    eligibleServices: [{ serviceId: "care" }],
    bookable: false,
  },
  { id: "b", publicName: "B", bookable: false },
  { id: "c", publicName: "C" },
] as Provider[];
describe("Public KTV display policy", () => {
  it("uses real chat IDs, filters hidden profiles and preserves service/booking constraints", () => {
    const rows = applyDisplayPolicy(providers, {
      version: 2,
      rows: [
        { providerId: "b", visible: true, position: 1 },
        {
          providerId: "a",
          visible: true,
          position: 2,
          publicName: "Tên mới",
          age: 22,
          introduction: "Giới thiệu mới",
        },
        { providerId: "c", visible: false },
      ],
    });
    expect(rows.map((row) => row.id)).toEqual(["b", "old-alias"]);
    expect(rows[1]).toMatchObject({
      publicName: "Tên mới",
      age: 22,
      introduction: "Giới thiệu mới",
      bookable: false,
      eligibleServices: providers[0].eligibleServices,
    });
  });
  it("never resurrects a missing or archived row, and supports clearing an old age", () => {
    expect(
      applyDisplayPolicy(providers, {
        version: 3,
        rows: [{ providerId: "a", visible: true, age: null }],
      })[0].age,
    ).toBeUndefined();
    expect(applyDisplayPolicy(providers, { version: 3, rows: [] })).toEqual([]);
  });
  it("moves up, down and directly to a position without duplicates", () => {
    expect(moveProvider(["a", "b", "c"], "c", 1)).toEqual(["c", "a", "b"]);
    expect(moveProvider(["a", "b", "c"], "a", 3)).toEqual(["b", "c", "a"]);
    expect(moveProvider(["a", "b", "c"], "b", 1)).toEqual(["b", "a", "c"]);
  });
});
