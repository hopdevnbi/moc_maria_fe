import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import providers from "@/features/mobile/demo-ktvs.json";
import { careMenu } from "@/features/mobile/official-menu";
vi.mock("@/features/mobile/data", async () => ({
  publicProviderDirectory: async () => ({
    providers: (await import("@/features/mobile/demo-ktvs.json")).default,
    services: [],
  }),
}));
describe("public service search directory", () => {
  it("uses menu names and complete provider assignments while preserving service links", async () => {
    const data = await (await GET()).json();
    expect(data.services.map((s: { name: string }) => s.name)).toEqual(careMenu.map((s) => s.name));
    expect(data.providers).toHaveLength(providers.length);
    expect(
      data.providers
        .filter((p: { services: string[] }) => p.services.includes("Gội đầu sạch"))
        .map((p: { publicName: string }) => p.publicName),
    ).toEqual(["Mai Anh", "Thanh Trúc", "Minh Châu"]);
    expect(data.services.find((s: { id: string }) => s.id === "demo-hair").slug).toBe(
      "goi-dau-duong-sinh-demo",
    );
  });
});
