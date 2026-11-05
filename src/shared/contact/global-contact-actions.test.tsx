import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalContactActions } from "./global-contact-actions";
const mocks = vi.hoisted(() => ({ loggedIn: false, authFetch: vi.fn(), path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.path }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: mocks.loggedIn ? "authenticated" : "anonymous",
    user: mocks.loggedIn ? { id: "customer-1", permissions: ["customer.portal"] } : null,
    authFetch: mocks.authFetch,
  }),
}));
vi.mock("@/features/gift-events/event-support", () => ({
  EventSupport: ({
    open,
    onOpenChange,
    user,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    user: { id: string } | null;
  }) =>
    open ? (
      <section role="dialog" aria-label="Support" data-user={user?.id}>
        <button onClick={() => onOpenChange(false)}>Fermer</button>
      </section>
    ) : null,
}));
afterEach(() => {
  cleanup();
  mocks.loggedIn = false;
  mocks.path = "/";
});
function open() {
  fireEvent.click(screen.getByRole("button", { name: "Mở tiện ích nhanh" }));
}
describe("Assistive Mộc Maria menu", () => {
  it("starts with one compact launcher and expands all three actions for guests", () => {
    render(<GlobalContactActions />);
    expect(screen.queryByRole("navigation", { name: "Tiện ích nhanh" })).not.toBeInTheDocument();
    open();
    expect(screen.getByRole("button", { name: "Support" })).toHaveFocus();
    const fb = screen.getByRole("link", { name: /Facebook Mộc Maria/ });
    expect(fb).toHaveAttribute("href", "https://www.facebook.com/mocmariads");
    expect(fb).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Check-in" })).toHaveAttribute("href", "/check-in");
  });
  it("keeps all actions available on chat and check-in routes for signed-in users", () => {
    mocks.loggedIn = true;
    mocks.path = "/tin-nhan";
    const { rerender } = render(<GlobalContactActions />);
    open();
    expect(screen.getByRole("link", { name: "Check-in" })).toBeVisible();
    mocks.path = "/check-in";
    rerender(<GlobalContactActions />);
    expect(screen.queryByRole("navigation", { name: "Tiện ích nhanh" })).not.toBeInTheDocument();
    open();
    expect(screen.getByRole("button", { name: "Support" })).toBeVisible();
  });
  it("dismisses by Escape and restores launcher focus", () => {
    render(<GlobalContactActions />);
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Mở tiện ích nhanh" })).toHaveFocus();
    expect(screen.queryByRole("navigation", { name: "Tiện ích nhanh" })).not.toBeInTheDocument();
  });
  it("dismisses outside, toggles, and clears on account changes", () => {
    const { rerender } = render(<GlobalContactActions />);
    open();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("navigation", { name: "Tiện ích nhanh" })).not.toBeInTheDocument();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Đóng tiện ích nhanh" }));
    open();
    mocks.loggedIn = true;
    rerender(<GlobalContactActions />);
    expect(screen.queryByRole("navigation", { name: "Tiện ích nhanh" })).not.toBeInTheDocument();
  });
  it("opens the existing support with the authenticated session and no duplicate launcher", () => {
    mocks.loggedIn = true;
    render(<GlobalContactActions />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Support" }));
    expect(screen.getByRole("dialog", { name: "Support" })).toHaveAttribute(
      "data-user",
      "customer-1",
    );
    expect(screen.queryByRole("navigation", { name: "Tiện ích nhanh" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đóng tiện ích nhanh" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
