import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventConsole } from "./event-console";

vi.mock("./event-admin", () => ({ GiftEventAdmin: () => <p>Campaign panel</p> }));
vi.mock("./gift-vouchers-admin", () => ({ GiftVouchersAdmin: () => <p>Voucher panel</p> }));
vi.mock("./gift-report-admin", () => ({ GiftReportAdmin: () => <p>Report panel</p> }));
vi.mock("./gift-operations-admin", () => ({ GiftOperationsAdmin: () => <p>Operations panel</p> }));
vi.mock("@/features/gift-events/gift-counter", () => ({ GiftCounter: () => <p>Counter panel</p> }));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("Event console tab navigation", () => {
  it("keeps all five tools in one page and updates the URL", () => {
    window.history.replaceState(null, "", "/quan-tri/su-kien");
    render(<EventConsole />);
    expect(screen.getByText("Campaign panel")).toBeInTheDocument();
    for (const [name, tab, panel] of [
      ["Đổi quà tại quầy", "counter", "Counter panel"],
      ["Voucher", "vouchers", "Voucher panel"],
      ["Đối soát", "report", "Report panel"],
      ["Vận hành", "operations", "Operations panel"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
      expect(new URLSearchParams(window.location.search).get("tab")).toBe(tab);
      expect(screen.getByText(panel)).toBeInTheDocument();
      expect(screen.queryByText("Campaign panel")).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: /Chiến dịch/ }));
    expect(window.location.search).toBe("");
    expect(screen.getByText("Campaign panel")).toBeInTheDocument();
  });
  it("honors a deep link and browser back including an invalid tab", () => {
    window.history.replaceState(null, "", "/quan-tri/su-kien?tab=counter");
    render(<EventConsole initialTab="counter" />);
    expect(screen.getByText("Counter panel")).toBeInTheDocument();
    window.history.replaceState(null, "", "/quan-tri/su-kien?tab=report");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(screen.getByText("Report panel")).toBeInTheDocument();
    window.history.replaceState(null, "", "/quan-tri/su-kien?tab=invalid");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(screen.getByText("Campaign panel")).toBeInTheDocument();
  });
});
