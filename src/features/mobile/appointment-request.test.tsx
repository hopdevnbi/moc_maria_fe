import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { AppointmentRequest } from "./appointment-request";
import demoProviders from "./demo-ktvs.json";
import demoServices from "./demo-services.json";
const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "customer", permissions: ["customer.portal"] },
    status: "authenticated",
    authFetch: state.fetch,
  }),
}));
vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
vi.mock("next/image", () => ({
  default: ({
    unoptimized: _u,
    ...props
  }: React.ComponentProps<"img"> & { unoptimized?: boolean }) => (
    <img {...props} alt={props.alt || ""} />
  ),
}));
beforeEach(() => {
  state.fetch.mockReset().mockResolvedValue({ id: "inquiry" });
  sessionStorage.clear();
});
afterEach(cleanup);
const providers = demoProviders.map((p, i) => ({
  ...p,
  chatEnabled: true,
  chatProviderId: "11111111-1111-4111-8111-" + String(i + 1).padStart(12, "0"),
}));
function mount() {
  render(<AppointmentRequest providers={providers} services={demoServices} initial={{}} />);
}
describe("appointment request flow", () => {
  it("finds KTV by unaccented service search without making unset schedules look available", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Tìm kỹ thuật viên"), {
      target: { value: "co vai gay" },
    });
    expect(screen.getByText("Mai Anh")).toBeInTheDocument();
    expect(screen.queryByText("Thu Hà")).not.toBeInTheDocument();
  });
  it("submits Hanoi home address and real receiver ID, retaining identity on failed retry", async () => {
    state.fetch.mockRejectedValueOnce(new Error("Mạng gián đoạn"));
    mount();
    fireEvent.change(screen.getByLabelText("Dịch vụ chăm sóc"), { target: { value: "demo-neck" } });
    fireEvent.click(screen.getByRole("button", { name: /Mai Anh/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tại địa chỉ của tôi" }));
    fireEvent.change(screen.getByLabelText("Địa chỉ nhận dịch vụ"), {
      target: { value: "12 Nguyễn Trãi, Thanh Xuân, Hà Nội" },
    });
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    fireEvent.change(screen.getByLabelText("Ngày & giờ mong muốn (giờ Hà Nội)"), {
      target: { value: future },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" }));
    await screen.findByText("Mạng gián đoạn");
    const first = JSON.parse(state.fetch.mock.calls[0][1].body);
    expect(first.providerId).toBe(providers[1].chatProviderId);
    expect(first.location).toBe("AT_HOME");
    expect(first.address).toContain("Hà Nội");
    expect(first.requestedAt).toBe(new Date(future + ":00+07:00").toISOString());
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" }));
    await screen.findByText("Đã gửi yêu cầu đến Mai Anh");
    const retry = JSON.parse(state.fetch.mock.calls[1][1].body);
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
  });
  it("does not enable sending until a service, provider, time and home address are supplied", () => {
    mount();
    expect(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tại địa chỉ của tôi" }));
    expect(screen.getByLabelText("Khu vực phục vụ")).toHaveValue("Hà Nội");
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("restores a short-lived sign-in draft without exposing the address in URLs", async () => {
    sessionStorage.setItem(
      "mocmaria.booking.signin-draft",
      JSON.stringify({
        providerId: providers[1].id,
        serviceId: "demo-neck",
        location: "AT_HOME",
        address: "12 Nguyễn Trãi, Hà Nội",
        requestedAt: "2026-12-01T14:00",
        notes: "60 phút",
        savedAt: Date.now(),
      }),
    );
    mount();
    await waitFor(() =>
      expect(screen.getByLabelText("Địa chỉ nhận dịch vụ")).toHaveValue("12 Nguyễn Trãi, Hà Nội"),
    );
    expect(sessionStorage.getItem("mocmaria.booking.signin-draft")).toBeNull();
  });
});
