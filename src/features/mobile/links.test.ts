import { describe, expect, it } from "vitest";
import { bookingHref } from "./links";

describe("booking deep-links", () => {
  it("keeps the unselected booking flow open", () => {
    expect(bookingHref({})).toBe("/dat-lich");
  });
  it("carries the selected provider into booking", () => {
    expect(bookingHref({ provider: "provider-123" })).toBe("/dat-lich?provider=provider-123");
  });
  it("carries service and variant without losing other selection", () => {
    expect(bookingHref({ provider: "ktv", service: "service", variant: "variant" })).toBe(
      "/dat-lich?provider=ktv&service=service&variant=variant",
    );
  });
});
