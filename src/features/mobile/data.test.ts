import { describe, expect, it } from "vitest";
import { persistedDirectory } from "./provider-directory";
import profiles from "./demo-ktvs.json";
import type { Provider, ChatProvider } from "@/features/marketplace/types";
const account = {
  id: "persisted-id",
  publicAlias: profiles[0].id,
  publicName: "Tên từ database",
  serviceArea: "Khu vực từ database",
  title: "KTV",
  avatarUrl: null,
  services: [],
} satisfies ChatProvider;
describe("Persisted provider directory", () => {
  it("uses backend names and excludes presentations without accounts", () => {
    const rows = persistedDirectory([], profiles as Provider[], [account]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      publicName: account.publicName,
      serviceArea: account.serviceArea,
      chatProviderId: account.id,
    });
  });
  it("does not duplicate an approved identity or display orphaned profiles", () => {
    expect(persistedDirectory([], profiles as Provider[], [])).toEqual([]);
    const approved = { ...profiles[0], id: account.id } as Provider;
    expect(persistedDirectory([approved], profiles as Provider[], [account])).toEqual([approved]);
  });
});
