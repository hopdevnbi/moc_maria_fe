import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DemoServiceDetail } from "./demo-service-detail";
import services from "./demo-services.json";
vi.mock("@/features/marketplace/public-api", () => ({
  publicRead: async () => ({ ok: true, data: [] }),
}));
vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(cleanup);
it("old service links display current names and prices without obsolete duration packages", async () => {
  render(await DemoServiceDetail({ item: services.find((s) => s.service.id === "demo-hair")! }));
  expect(screen.getByRole("heading", { level: 1, name: "Gội đầu sạch" })).toBeInTheDocument();
  expect(screen.getByText("Giá 49.000 ₫")).toBeInTheDocument();
  expect(screen.queryByText(/Gội đầu dưỡng sinh/)).not.toBeInTheDocument();
  expect(screen.queryByText(/phút/)).not.toBeInTheDocument();
});
