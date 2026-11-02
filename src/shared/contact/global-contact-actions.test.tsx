import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalContactActions } from "./global-contact-actions";

const mocks = vi.hoisted(() => ({
  loggedIn: false,
  authFetch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: mocks.loggedIn ? "authenticated" : "anonymous",
    user: mocks.loggedIn ? { id: "sample-customer" } : null,
    authFetch: mocks.authFetch,
  }),
}));
vi.mock("@/features/gift-events/event-support", () => ({
  EventSupport: ({ status, user }: { status: string; user: { id: string } | null }) => (
    <button
      type="button"
      aria-label="Hỗ trợ online toàn website"
      data-status={status}
      data-user={user?.id}
    />
  ),
}));

afterEach(() => {
  cleanup();
  mocks.loggedIn = false;
});

describe("global Mộc Maria contact actions", () => {
  it("shows exactly one support button and one official Facebook link to guests", () => {
    render(<GlobalContactActions />);
    expect(screen.getAllByRole("button", { name: "Hỗ trợ online toàn website" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Hỗ trợ online toàn website" })).toHaveAttribute(
      "data-status",
      "anonymous",
    );
    const facebook = screen.getByRole("link", { name: /Fanpage Facebook Mộc Maria/ });
    expect(facebook).toHaveAttribute("href", "https://www.facebook.com/mocmariads");
    expect(facebook).toHaveAttribute("target", "_blank");
    expect(facebook).toHaveAttribute("rel", "noopener noreferrer");
  });
  it("passes the signed-in session through to the existing KTV support", () => {
    mocks.loggedIn = true;
    render(<GlobalContactActions />);
    expect(screen.getByRole("button", { name: "Hỗ trợ online toàn website" })).toHaveAttribute(
      "data-user",
      "sample-customer",
    );
  });
});
