import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerAttendanceCard } from "./customer-attendance-card";
import { hcmDate, type StaffAttendanceMe } from "./data";

const mock = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "customer-a", roles: ["CUSTOMER"], isActive: true },
    authFetch: mock.fetch,
  }),
}));
let current: StaffAttendanceMe;
let gps: ReturnType<typeof vi.fn>;
let locationCallback: PositionCallback;
function display() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CustomerAttendanceCard />
    </QueryClientProvider>,
  );
}
const fakePosition = (latitude: number, accuracy = 12): GeolocationPosition => ({
  timestamp: Date.now(),
  coords: {
    latitude,
    longitude: 105,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  },
  toJSON: () => ({}),
});
beforeEach(() => {
  current = {
    localDate: hcmDate(),
    today: null,
    wallet: { balance: 0, totalEarned: 0 },
    branches: [{ id: "branch-1", name: "Mộc Maria", latitude: 21, longitude: 105 }],
    policy: {
      radiusMeters: 100,
      coinsPerValidCheckIn: 5,
      timezone: "Asia/Ho_Chi_Minh",
      maxCheckInsPerDay: 1,
    },
  };
  mock.fetch.mockReset().mockImplementation(async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      current = {
        ...current,
        wallet: { balance: 5, totalEarned: 5 },
        today: { id: "record-1", branchId: "branch-1", status: "IN_RANGE", coinsEarned: 5 },
      };
    }
    return structuredClone(current);
  });
  gps = vi.fn((resolve) => {
    locationCallback = resolve as PositionCallback;
  });
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: gps } });
  vi.stubGlobal("crypto", { randomUUID: () => "a4facc87-9375-43f4-a5dc-6f879b7ab069" });
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("customer daily check-in", () => {
  it("shows a prominent 100m GPS button and awards 5 coins only after GPS validation", async () => {
    display();
    const button = await screen.findByRole("button", { name: "Check-in ngay · Nhận 5 coin" });
    expect(mock.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    fireEvent.click(button);
    await act(async () => locationCallback(fakePosition(21)));
    await screen.findByText("Bạn đã check-in hôm nay!");
    const posted = mock.fetch.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(posted[0]).toBe("/customer-attendance/check-ins");
    expect(JSON.parse(posted[1].body)).toMatchObject({
      branchId: "branch-1",
      deviceId: "a4facc87-9375-43f4-a5dc-6f879b7ab069",
    });
    expect(screen.getByText("+5 coin · Hẹn gặp lại vào ngày mai")).toBeVisible();
  });
  it("never sends an award request outside 100m", async () => {
    display();
    fireEvent.click(await screen.findByRole("button", { name: "Check-in ngay · Nhận 5 coin" }));
    await act(async () => locationCallback(fakePosition(21.003)));
    expect(await screen.findByRole("alert")).toHaveTextContent("ngoài phạm vi 100m");
    expect(mock.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("refuses GPS with more than 50m error without counting the day", async () => {
    display();
    fireEvent.click(await screen.findByRole("button", { name: "Check-in ngay · Nhận 5 coin" }));
    await act(async () => locationCallback(fakePosition(21, 85)));
    expect(await screen.findByRole("alert")).toHaveTextContent("GPS chưa đủ chính xác");
    expect(mock.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("does not request geolocation or award coins after an existing daily check-in", async () => {
    current.today = { id: "checked", branchId: "branch-1", status: "IN_RANGE", coinsEarned: 5 };
    display();
    await screen.findByText("Bạn đã check-in hôm nay!");
    expect(gps).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Check-in ngay · Nhận 5 coin" }),
    ).not.toBeInTheDocument();
  });
});
