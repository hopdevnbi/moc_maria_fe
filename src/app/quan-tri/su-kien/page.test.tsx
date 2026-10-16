import { Suspense, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import EventsAdminPage from "./page";

// Only the component is available across the client boundary, not executable tab data.
vi.mock("@/features/gift-events-admin/event-console", () => ({
  EventConsole: () => null,
}));
vi.mock("@/features/marketplace/admin-shell", () => ({ AdminShell: () => null }));
vi.mock("@/shared/loading/loading-state", () => ({ LoadingState: () => null }));

type EntryProps = { searchParams: Promise<{ tab?: string | string[] }> };
type Entry = ReactElement<
  EntryProps,
  (props: EntryProps) => Promise<ReactElement<{ initialTab: string }>>
>;

describe("Event admin server entry", () => {
  it.each([
    [undefined, "campaign"],
    ["campaign", "campaign"],
    ["counter", "counter"],
    ["vouchers", "vouchers"],
    ["report", "report"],
    ["operations", "operations"],
    ["unknown", "campaign"],
    [["counter", "report"], "campaign"],
  ])("streams the shell and safely resolves tab %s to %s", async (tab, expected) => {
    const searchParams = Promise.resolve({ tab });
    const shell = EventsAdminPage({ searchParams });
    expect(isValidElement(shell)).toBe(true);
    const boundary = shell.props.children as ReactElement<{ children: Entry }>;
    expect(boundary.type).toBe(Suspense);
    const entry = boundary.props.children;
    const console = await entry.type(entry.props);
    expect(console.props.initialTab).toBe(expected);
  });
});
