import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAttendanceCard } from "./staff-attendance-card";
import { ApiError } from "@/features/auth/auth-api";
import { hcmDate, type StaffAttendanceMe } from "./data";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), prepareSelfie: vi.fn(), id: "staff-1" }));
vi.mock("./selfie-image", () => ({ prepareAttendanceSelfie: mocks.prepareSelfie }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: mocks.id, isActive: true, roles: ["THERAPIST"], permissions: ["staff.portal"] },
    authFetch: mocks.fetch,
  }),
}));
let current: StaffAttendanceMe;
let locate: ReturnType<typeof vi.fn>;
let locationSuccess: PositionCallback;
let watchSuccess: PositionCallback;
let watch: ReturnType<typeof vi.fn>;
let clearWatch: ReturnType<typeof vi.fn>;
function draw() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StaffAttendanceCard standalone />
    </QueryClientProvider>,
  );
}
const gps = () => screen.getByRole("button", { name: "Check-in bằng GPS" });
const posts = () => mocks.fetch.mock.calls.filter((c) => c[1]?.method === "POST");
function point(latitude = 21, accuracy = 15, timestamp = Date.now()): GeolocationPosition {
  return {
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
    timestamp,
    toJSON: () => ({}),
  };
}
beforeEach(() => {
  mocks.id = "staff-1";
  mocks.fetch.mockReset();
  mocks.prepareSelfie.mockReset().mockImplementation(async (file: File) => file);
  current = {
    localDate: hcmDate(),
    today: null,
    wallet: { balance: 0, totalEarned: 0 },
    branches: [{ id: "branch-1", name: "Mộc Maria", latitude: 21, longitude: 105 }],
    policy: {
      radiusMeters: 200,
      coinsPerValidCheckIn: 5,
      timezone: "Asia/Ho_Chi_Minh",
      maxCheckInsPerDay: 1,
    },
  };
  mocks.fetch.mockImplementation(async (_path, init) => {
    if (String(_path).endsWith("/selfie")) {
      current = {
        ...current,
        today: {
          ...current.today!,
          selfieUrl: "https://giangxa-media-cdn.b-cdn.net/moc-maria/staff-attendance/selfie.webp",
        },
      };
      return structuredClone(current.today);
    }
    if (init?.method === "POST")
      current = {
        ...current,
        today: {
          id: "attendance-1",
          branchId: "branch-1",
          status:
            JSON.parse(init.body).latitude === undefined ? "LOCATION_UNAVAILABLE" : "IN_RANGE",
          coinsEarned: JSON.parse(init.body).latitude === undefined ? 0 : 5,
        },
        wallet: { balance: 5, totalEarned: 5 },
      };
    return structuredClone(current);
  });
  locate = vi.fn((success) => {
    locationSuccess = success;
  });
  watch = vi.fn((success) => {
    watchSuccess = success;
    return 7;
  });
  clearWatch = vi.fn();
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition: locate, watchPosition: watch, clearWatch },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("attendance client boundaries", () => {
  it("offers separate front camera and gallery on mobile and confirms the CDN link after upload", async () => {
    current.today = {
      id: "attendance-1",
      branchId: "branch-1",
      status: "IN_RANGE",
      coinsEarned: 5,
      selfieUrl: null,
    };
    draw();
    const camera = await screen.findByLabelText("Chụp selfie bằng camera trước");
    const gallery = screen.getByLabelText("Chọn ảnh selfie từ thư viện");
    expect(camera).toHaveAttribute("capture", "user");
    expect(gallery).not.toHaveAttribute("capture");
    const image = new File(["selfie"], "selfie.jpg", { type: "image/jpeg" });
    fireEvent.change(gallery, { target: { files: [image] } });
    expect(await screen.findByRole("link", { name: "Xem selfie đã gửi" })).toHaveAttribute(
      "href",
      expect.stringContaining("/moc-maria/staff-attendance/selfie.webp"),
    );
    const selfiePost = posts().filter((call) => String(call[0]).endsWith("/selfie"));
    expect(selfiePost).toHaveLength(1);
    expect(selfiePost[0][1].body).toBeInstanceOf(FormData);
    expect((selfiePost[0][1].body as FormData).get("file")).toBeInstanceOf(File);
    expect(mocks.prepareSelfie).toHaveBeenCalledWith(image);
  });

  it("lets a user choose the same photo again after an upload error, without inventing success", async () => {
    current.today = {
      id: "attendance-1",
      branchId: "branch-1",
      status: "IN_RANGE",
      coinsEarned: 5,
      selfieUrl: null,
    };
    mocks.prepareSelfie.mockRejectedValueOnce(new Error("Không xử lý được ảnh selfie"));
    draw();
    const input = await screen.findByLabelText("Chọn ảnh selfie từ thư viện");
    const image = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Không xử lý được ảnh selfie");
    expect(screen.queryByRole("link", { name: "Xem selfie đã gửi" })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByRole("link", { name: "Xem selfie đã gửi" })).toBeInTheDocument();
    expect(mocks.prepareSelfie).toHaveBeenCalledTimes(2);
    expect(posts().filter((call) => String(call[0]).endsWith("/selfie"))).toHaveLength(1);
  });
  it("stops automatic GPS in the background and ignores a delayed reading", async () => {
    let visibility = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility as DocumentVisibilityState,
    );
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(watch).toHaveBeenCalledTimes(1));
    const oldReading = watchSuccess;
    visibility = "hidden";
    fireEvent(document, new Event("visibilitychange"));
    expect(clearWatch).toHaveBeenCalledWith(7);
    await act(async () => oldReading(point()));
    expect(posts()).toHaveLength(0);
    visibility = "visible";
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(watch).toHaveBeenCalledTimes(2));
    await act(async () => watchSuccess(point()));
    await screen.findByText(/Đã check-in hôm nay/);
    expect(posts()).toHaveLength(1);
  });
  it("does not submit a pending GPS reading across Vietnamese midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T16:59:59Z"));
    current.localDate = hcmDate();
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    vi.setSystemTime(new Date("2026-11-05T17:00:01Z"));
    await act(async () => locationSuccess(point()));
    expect(posts()).toHaveLength(0);
    expect(screen.getByText(/Đã sang ngày mới/)).toBeVisible();
  });
  it("does not request GPS until clicked; locks repeated clicks and immediately displays server result", async () => {
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    expect(locate).not.toHaveBeenCalled();
    fireEvent.click(gps());
    fireEvent.click(screen.getByRole("button", { name: "Đang ghi nhận..." }));
    expect(locate).toHaveBeenCalledTimes(1);
    await act(async () => locationSuccess(point()));
    await screen.findByText(/Đã check-in hôm nay/);
    expect(posts()).toHaveLength(1);
    expect(JSON.parse(posts()[0][1].body)).toEqual({
      branchId: "branch-1",
      latitude: 21,
      longitude: 105,
      accuracyMeters: 15,
    });
    expect(screen.queryByRole("button", { name: "Check-in bằng GPS" })).not.toBeInTheDocument();
  });
  it("requires explicit confirmation for no-GPS zero coins", async () => {
    draw();
    fireEvent.click(await screen.findByRole("button", { name: "Check-in không có GPS (+0 coin)" }));
    expect(posts()).toHaveLength(0);
    expect(screen.getByText(/không thể check-in lại/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận điểm danh +0 coin" }));
    await screen.findByText(/Đã check-in hôm nay/);
    expect(JSON.parse(posts()[0][1].body)).toEqual({ branchId: "branch-1" });
    expect(locate).not.toHaveBeenCalled();
  });
  it("allows cancelling outside-range check-in before writing", async () => {
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    await act(async () => locationSuccess(point(21.01)));
    expect(posts()).toHaveLength(0);
    expect(screen.getByRole("group", { name: "Xác nhận điểm danh không nhận coin" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(gps()).toBeEnabled();
  });
  it.each([200, -1, NaN])("never posts an imprecise GPS reading (%s)", async (accuracy) => {
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    await act(async () => locationSuccess(point(21, accuracy)));
    expect(posts()).toHaveLength(0);
    expect(await screen.findByRole("alert")).toHaveTextContent("GPS chưa đủ chính xác");
  });
  it("does not write when a delayed GPS permission completes after unmount", async () => {
    const { unmount } = draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    unmount();
    await act(async () => locationSuccess(point()));
    expect(posts()).toHaveLength(0);
  });
  it("blocks retries after a lost response until status is reconciled", async () => {
    const original = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation(async (path, init) => {
      if (init?.method === "POST") {
        await original(path, init);
        throw new Error("Kết nối gián đoạn");
      }
      return original(path, init);
    });
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    await act(async () => locationSuccess(point()));
    await screen.findByText(/Đã check-in hôm nay/);
    expect(posts()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Check-in bằng GPS" })).not.toBeInTheDocument();
  });
  it("reconciles failed requests without an automatic second mutation", async () => {
    mocks.fetch.mockImplementation(async (_path, init) => {
      if (init?.method === "POST") throw new Error("Kết nối gián đoạn");
      return structuredClone(current);
    });
    draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    await act(async () => locationSuccess(point()));
    await screen.findByRole("button", { name: "Kiểm tra trạng thái" });
    expect(gps()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra trạng thái" }));
    await waitFor(() => expect(gps()).toBeEnabled());
    expect(posts()).toHaveLength(1);
  });
  it("shows a clear customer permission message instead of an empty check-in page", async () => {
    mocks.fetch.mockRejectedValue(new ApiError(403, "Forbidden"));
    draw();
    expect(await screen.findByRole("alert")).toHaveTextContent("chưa được cấp quyền điểm danh");
    expect(locate).not.toHaveBeenCalled();
  });
  it("never sends GPS for a different account after account change", async () => {
    const view = draw();
    await screen.findByRole("button", { name: "Check-in bằng GPS" });
    fireEvent.click(gps());
    const oldCallback = locationSuccess;
    mocks.id = "staff-2";
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <StaffAttendanceCard standalone />
      </QueryClientProvider>,
    );
    await act(async () => oldCallback(point()));
    expect(posts()).toHaveLength(0);
  });
});
