import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckInJourneySharing } from "./check-in-journey-sharing";

const state = vi.hoisted(() => ({
  user: { id: "ktv", isActive: true, roles: ["THERAPIST"] as string[] },
  fetch: vi.fn(),
  watch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, authFetch: state.fetch }),
}));
vi.mock("@/features/safety/geolocation", () => ({ watchSafetyLocation: state.watch }));

const session = () => ({
  id: "shift-123",
  providerName: "KTV thử nghiệm",
  status: "TRAVELLING",
  purpose: "SHIFT",
  sharing: true,
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
  expectedCheckAt: new Date(Date.now() + 2 * 3600000).toISOString(),
  locationState: "WAITING",
  overdue: false,
  visit: null,
  point: null,
  sos: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: "ktv", isActive: true, roles: ["THERAPIST"] };
  state.fetch.mockImplementation((path: string) => {
    if (path === "/ktv-safety/me") return Promise.resolve([]);
    if (path === "/ktv-safety/shift") return Promise.resolve(session());
    return Promise.resolve(session());
  });
  state.watch.mockReturnValue(vi.fn());
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {} });
});
afterEach(cleanup);

describe("Visible check-in GPS journey sharing", () => {
  it.each([
    ["KTV", ["THERAPIST"]],
    ["doctor consultant", ["DOCTOR_CONSULTANT"]],
    ["Super Admin", ["SUPER_ADMIN"]],
  ])(
    "lets %s opt in with a clear button, without starting GPS from check-in",
    async (_role, roles) => {
      state.user = { id: "staff", isActive: true, roles };
      render(<CheckInJourneySharing />);
      const open = await screen.findByRole("button", { name: "Bắt đầu chia sẻ hành trình" });
      expect(state.watch).not.toHaveBeenCalled();
      expect(state.fetch).not.toHaveBeenCalledWith("/ktv-safety/shift", expect.anything());
      fireEvent.click(open);
      const consent = screen.getByRole("checkbox");
      expect(consent).toBeRequired();
      expect(consent).not.toBeChecked();
      fireEvent.click(consent);
      fireEvent.click(screen.getByRole("button", { name: "Đồng ý và bật chia sẻ GPS" }));
      await waitFor(() =>
        expect(state.fetch).toHaveBeenCalledWith(
          "/ktv-safety/shift",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"consent":true'),
          }),
        ),
      );
      await screen.findByText("Đang chia sẻ hành trình trên thiết bị này");
      expect(state.watch).toHaveBeenCalledTimes(1);
      if (roles.includes("SUPER_ADMIN")) {
        expect(screen.getByText(/Super Admin khác có thể theo dõi phiên/)).toBeInTheDocument();
      }
    },
  );

  it.each([
    ["customer", ["CUSTOMER"], true],
    ["inactive KTV", ["THERAPIST"], false],
    ["inactive Super Admin", ["SUPER_ADMIN"], false],
  ])("does not offer GPS or call private APIs for %s", (_name, roles, isActive) => {
    state.user = { id: "blocked", roles, isActive };
    render(<CheckInJourneySharing />);
    expect(screen.queryByText("Chia sẻ hành trình GPS")).not.toBeInTheDocument();
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.watch).not.toHaveBeenCalled();
  });

  it("requires a deliberate resume after page reload and stops GPS when paused", async () => {
    const stopWatch = vi.fn();
    state.watch.mockReturnValue(stopWatch);
    state.fetch.mockImplementation((path: string, options?: { body?: string }) => {
      if (path === "/ktv-safety/me") return Promise.resolve([session()]);
      if (path.endsWith("/action")) {
        const action = JSON.parse(options?.body ?? "{}") as { action: string };
        return Promise.resolve({
          ...session(),
          sharing: action.action !== "PAUSE",
        });
      }
      return Promise.resolve(session());
    });
    render(<CheckInJourneySharing />);
    await screen.findByText("Phiên đang bật · GPS chưa chạy trên thiết bị này");
    expect(state.watch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục chia sẻ GPS" }));
    await waitFor(() => expect(state.watch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Tạm dừng GPS" }));
    await waitFor(() => expect(stopWatch).toHaveBeenCalled());
    expect(screen.getByText("Đã tạm dừng chia sẻ GPS")).toBeInTheDocument();
  });

  it("requires explicit confirmation and then stops publishing the session", async () => {
    state.user = { id: "admin", roles: ["SUPER_ADMIN"], isActive: true };
    state.fetch.mockImplementation((path: string, options?: { body?: string }) => {
      if (path === "/ktv-safety/me") return Promise.resolve([session()]);
      if (path.endsWith("/action") && options?.body?.includes('"STOP"')) {
        return Promise.resolve({ ...session(), status: "STOPPED", sharing: false });
      }
      return Promise.resolve(session());
    });
    render(<CheckInJourneySharing />);
    fireEvent.click(await screen.findByRole("button", { name: "Dừng chia sẻ hành trình" }));
    expect(state.fetch).not.toHaveBeenCalledWith("/ktv-safety/shift-123/action", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận dừng và xóa hành trình" }));
    await waitFor(() =>
      expect(state.fetch).toHaveBeenCalledWith(
        "/ktv-safety/shift-123/action",
        expect.objectContaining({ body: JSON.stringify({ action: "STOP" }) }),
      ),
    );
    await screen.findByRole("button", { name: "Bắt đầu chia sẻ hành trình" });
  });
});
