import type { Provider, ChatProvider } from "@/features/marketplace/types";
export function persistedDirectory(
  approved: Provider[],
  presentations: Provider[],
  accounts: ChatProvider[],
): Provider[] {
  return [
    ...approved,
    ...presentations.flatMap((p) => {
      const receiver = accounts.find((c) => c.publicAlias === p.id);
      if (!receiver || approved.some((existing) => existing.id === receiver.id)) return [];
      return [
        {
          ...p,
          publicName: receiver.publicName,
          serviceArea: receiver.serviceArea,
          chatProviderId: receiver.id,
          chatEnabled: true,
        },
      ];
    }),
  ];
}
