import { describe, it, expect } from "vitest";
import { safeReturnTo } from "./return-to";
describe("registration/login return path", () => {
  it("preserves the selected KTV and service", () =>
    expect(safeReturnTo("/tin-nhan?provider=abc&service=neck")).toBe(
      "/tin-nhan?provider=abc&service=neck",
    ));
  it("refuses external, protocol-relative and backslash redirect paths", () => {
    for (const path of [
      "https://external.test",
      "//external.test",
      "/\\external.test",
      "/\nexternal.test",
      "",
    ])
      expect(safeReturnTo(path, "/chuyen-vien")).toBe("/chuyen-vien");
  });
});
