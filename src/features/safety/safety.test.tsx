import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderSafety } from "./provider-safety";
import { AdminSafety } from "./admin-safety";
const state = vi.hoisted(() => ({
  user: { id: "ktv", roles: ["THERAPIST"] },
  fetch: vi.fn(),
  watch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, authFetch: state.fetch }),
}));
vi.mock("./geolocation", () => ({ watchSafetyLocation: state.watch }));
vi.mock("./safety-map", () => ({ SafetyMap: () => <div>Bản đồ kiểm tra</div> }));
const session = () => ({
  id: "session",
  providerName: "Linh Anh",
  inquiryId: "inquiry",
  status: "TRAVELLING",
  sharing: true,
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  expectedCheckAt: new Date(Date.now() + 600000).toISOString(),
  point: null,
  sos: null,
  visit: { customerName: "Khách QA", serviceName: "Massage", address: "Địa chỉ kiểm tra Hà Nội" },
});
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: "ktv", roles: ["THERAPIST"] };
  state.watch.mockReturnValue(vi.fn());
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {} });
});
afterEach(cleanup);
describe("Safety consent and SOS UI", () => {
  it("does not start GPS automatically for a loaded session; explicit resume starts it", async () => {
    state.fetch.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/appointment-inquiries" ? [] : path.endsWith("/action") ? session() : [session()],
      ),
    );
    render(<ProviderSafety />);
    await screen.findByText("Đang trên đường");
    expect(state.watch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục chia sẻ GPS" }));
    await waitFor(() => expect(state.watch).toHaveBeenCalledTimes(1));
  });
  it("requires voluntary consent before starting a trip", async () => {
    state.fetch.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/appointment-inquiries"
          ? [
              {
                id: "inquiry",
                customerId: "customer",
                customerName: "Khách QA",
                location: "AT_HOME",
                status: "CONTACTED",
                serviceName: "Massage",
                address: "Hà Nội",
              },
            ]
          : path === "/ktv-safety"
            ? session()
            : [],
      ),
    );
    render(<ProviderSafety />);
    await screen.findByText("Bắt đầu chuyến phục vụ tại nhà");
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeRequired();
    expect(state.watch).not.toHaveBeenCalled();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Bật chế độ an toàn & GPS" }));
    await waitFor(() =>
      expect(state.fetch).toHaveBeenCalledWith(
        "/ktv-safety",
        expect.objectContaining({ body: expect.stringContaining('"consent":true') }),
      ),
    );
  });
  it("shows a failed SOS as unsent and does not imply admin acknowledgement", async () => {
    state.fetch.mockImplementation((path: string) =>
      path.endsWith("/action")
        ? Promise.reject(new Error("Mất mạng"))
        : Promise.resolve(path === "/appointment-inquiries" ? [] : [session()]),
    );
    render(<ProviderSafety />);
    await screen.findByText("Đang trên đường");
    fireEvent.click(screen.getByRole("button", { name: "Tôi cần hỗ trợ · SOS" }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi SOS ngay" }));
    await screen.findByText(/SOS chưa gửi thành công/);
    expect(screen.queryByText("Quản trị đã tiếp nhận SOS")).not.toBeInTheDocument();
  });
  it("prevents a customer from requesting monitoring and GPS", () => {
    state.user = { id: "customer", roles: ["CUSTOMER"] };
    render(<ProviderSafety />);
    expect(screen.getByRole("alert")).toHaveTextContent("kỹ thuật viên");
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.watch).not.toHaveBeenCalled();
  });
  it("blocks non-superadmin monitoring and does not load external maps automatically", async () => {
    state.user = { id: "customer", roles: ["CUSTOMER"] };
    const r = render(<AdminSafety />);
    expect(screen.getByRole("alert")).toHaveTextContent("super admin");
    expect(state.fetch).not.toHaveBeenCalled();
    r.unmount();
    state.user = { id: "admin", roles: ["SUPER_ADMIN"] };
    state.fetch.mockResolvedValue({ serverTime: new Date().toISOString(), sessions: [] });
    render(<AdminSafety />);
    await screen.findByText("Chưa có phiên chia sẻ vị trí");
    expect(screen.queryByText("Bản đồ kiểm tra")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mở bản đồ" }));
    expect(screen.getByText("Bản đồ kiểm tra")).toBeInTheDocument();
  });
});
