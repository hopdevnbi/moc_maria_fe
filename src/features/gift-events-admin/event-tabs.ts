// Pure shared values: this module is used by both the route server and client console.
export const eventTabs = ["campaign", "counter", "vouchers", "report", "operations"] as const;
export type EventTab = (typeof eventTabs)[number];

export function parseEventTab(value: unknown): EventTab {
  return typeof value === "string" && eventTabs.some((tab) => tab === value)
    ? (value as EventTab)
    : "campaign";
}
