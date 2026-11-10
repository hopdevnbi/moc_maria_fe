import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppointmentsPage from "./appointments";
const mock = vi.hoisted(() => ({
  fetch: vi.fn(),
  user: { id: "staff", roles: ["THERAPIST"], permissions: [] },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mock.user, status: "authenticated", authFetch: mock.fetch }),
}));
vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
afterEach(() => {
  cleanup();
  mock.fetch.mockReset();
});
describe("staff personal inquiry tracking", () => {
  it("shows only sent requests and cancels under the buyer identity without legacy customer APIs", async () => {
    const own = {
      id: "own",
      customerId: "staff",
      providerId: "other",
      providerName: "KTV khác",
      serviceName: "Dịch vụ của tôi",
      status: "PENDING",
      location: "ON_SITE",
      address: "Tại cơ sở",
      requestedAt: "2026-11-11T08:00:00Z",
      notes: "",
    };
    mock.fetch.mockImplementation(async (path: string, init?: RequestInit) =>
      path === "/appointment-inquiries"
        ? [own, { ...own, id: "received", customerId: "someone", serviceName: "Yêu cầu khách gửi" }]
        : init?.method === "PATCH"
          ? {}
          : [],
    );
    render(<AppointmentsPage />);
    expect(await screen.findByText(/Dịch vụ của tôi/)).toBeInTheDocument();
    expect(screen.queryByText(/Yêu cầu khách gửi/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở chat" })).toHaveAttribute(
      "href",
      "/tin-nhan?provider=other",
    );
    fireEvent.click(screen.getByRole("button", { name: "Hủy yêu cầu" }));
    await waitFor(() =>
      expect(mock.fetch).toHaveBeenCalledWith(
        "/appointment-inquiries/own",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
      ),
    );
    expect(mock.fetch.mock.calls.some(([path]) => path.startsWith("/bookings"))).toBe(false);
  });
});
