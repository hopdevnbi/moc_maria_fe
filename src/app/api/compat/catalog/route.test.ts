// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ directory: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/features/mobile/data", () => ({ publicProviderDirectory: mocks.directory }));
import { GET } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.clearAllMocks());
describe("public compatibility catalog", () => {
  it("uses the same visible persisted receivers and allowed services as normal booking", async () => {
    mocks.directory.mockResolvedValue({
      services: [],
      providers: [
        {
          id: "legacy-profile",
          chatProviderId: id,
          publicName: "KTV",
          isDemo: true,
          chatEnabled: true,
          demoServices: [{ id: "demo-neck" }],
          privateNotes: "must not leak",
        },
        { id: "unlinked", publicName: "Unlinked", isDemo: true, chatEnabled: false },
      ],
    });
    const response = await GET();
    const data = await response.json();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(data.providers).toEqual([
      { id, name: "KTV", services: [{ id: "demo-neck", name: "Massage chân" }] },
    ]);
    expect(JSON.stringify(data)).not.toContain("must not leak");
  });
  it("does not invent providers if the directory is empty", async () => {
    mocks.directory.mockResolvedValue({ services: [], providers: [] });
    expect((await (await GET()).json()).providers).toEqual([]);
  });
});
