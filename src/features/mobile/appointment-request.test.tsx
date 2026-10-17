import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { AppointmentRequest } from "./appointment-request";
import demoProviders from "./demo-ktvs.json";
import demoServices from "./demo-services.json";
import { careMenu } from "./official-menu";
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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const providers = demoProviders.map((p, i) => ({
  ...p,
  chatEnabled: true,
  chatProviderId: "11111111-1111-4111-8111-" + String(i + 1).padStart(12, "0"),
}));
function mount() {
  render(<AppointmentRequest providers={providers} services={demoServices} initial={{}} />);
}
describe("appointment request flow", () => {
  it("selects the first compatible service for a linked KTV without sending automatically", () => {
    render(
      <AppointmentRequest
        providers={providers}
        services={demoServices}
        initial={{ provider: providers[0].id }}
      />,
    );
    const first = demoServices.find((s) =>
      providers[0].demoServices.some((o) => o.id === s.service.id),
    )!;
    expect(screen.getByLabelText("Dịch vụ chăm sóc")).toHaveValue(first.service.id);
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("preserves an explicitly linked compatible service over the default", () => {
    const choices = demoServices.filter((s) =>
      providers[0].demoServices.some((o) => o.id === s.service.id),
    );
    render(
      <AppointmentRequest
        providers={providers}
        services={demoServices}
        initial={{ provider: providers[0].id, service: choices.at(-1)!.service.id }}
      />,
    );
    expect(screen.getByLabelText("Dịch vụ chăm sóc")).toHaveValue(choices.at(-1)!.service.id);
  });
  it.each([
    ["2026-10-13T16:30:20Z", "2026-10-14T00:31"],
    ["2026-12-31T16:00:00Z", "2027-01-01T00:00"],
  ])("defaults to now plus one hour in Hanoi, including day rollover (%s)", (now, expected) => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    mount();
    expect(screen.getByLabelText("Ngày & giờ mong muốn (giờ Hà Nội)")).toHaveValue(expected);
    expect(screen.getByLabelText("Ngày & giờ mong muốn (giờ Hà Nội)")).toHaveAttribute(
      "min",
      expected,
    );
  });
  it("keeps an expired draft time from replacing the fresh default and rejects earlier times", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-13T03:00:00Z"));
    sessionStorage.setItem(
      "mocmaria.booking.signin-draft",
      JSON.stringify({
        providerId: providers[0].id,
        serviceId: "demo-neck",
        requestedAt: "2026-10-13T09:00",
        savedAt: Date.now(),
      }),
    );
    render(
      <AppointmentRequest
        providers={providers}
        services={demoServices}
        initial={{ provider: providers[0].id }}
      />,
    );
    await waitFor(() => expect(sessionStorage.getItem("mocmaria.booking.signin-draft")).toBeNull());
    expect(screen.getByLabelText("Ngày & giờ mong muốn (giờ Hà Nội)")).toHaveValue(
      "2026-10-13T11:00",
    );
    fireEvent.change(screen.getByLabelText("Ngày & giờ mong muốn (giờ Hà Nội)"), {
      target: { value: "2026-10-13T10:30" },
    });
    expect(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" })).toBeDisabled();
  });
  it.each([providers[3].id, providers[3].chatProviderId])(
    "preselects the linked KTV by %s and allows an explicit change",
    (provider) => {
      render(
        <AppointmentRequest providers={providers} services={demoServices} initial={{ provider }} />,
      );
      expect(screen.getByRole("button", { name: /Bảo Ngọc/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.queryByLabelText("Tìm kỹ thuật viên")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Mai Anh/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Đổi KTV" }));
      fireEvent.click(screen.getByRole("button", { name: /Mai Anh/ }));
      expect(screen.getByRole("button", { name: /Mai Anh/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    },
  );
  it("does not let an older sign-in draft override a newly linked provider", async () => {
    sessionStorage.setItem(
      "mocmaria.booking.signin-draft",
      JSON.stringify({
        providerId: providers[1].id,
        serviceId: "demo-neck",
        location: "AT_HOME",
        address: "12 Nguyễn Trãi, Hà Nội",
        savedAt: Date.now(),
      }),
    );
    render(
      <AppointmentRequest
        providers={providers}
        services={demoServices}
        initial={{ provider: providers[3].id }}
      />,
    );
    await waitFor(() => expect(sessionStorage.getItem("mocmaria.booking.signin-draft")).toBeNull());
    expect(screen.getByRole("button", { name: /Bảo Ngọc/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Dịch vụ chăm sóc")).toHaveValue(
      demoServices.find((s) => providers[3].demoServices.some((o) => o.id === s.service.id))!
        .service.id,
    );
    expect(screen.queryByLabelText("Địa chỉ nhận dịch vụ")).not.toBeInTheDocument();
  });
  it("finds KTV by unaccented service search without making unset schedules look available", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Tìm kỹ thuật viên"), {
      target: { value: "massage body" },
    });
    expect(screen.getByText("Mai Anh")).toBeInTheDocument();
    expect(screen.queryByText("Thu Hà")).not.toBeInTheDocument();
  });
  it("uses the official menu in service choices, filtering and price while retaining the API ID", () => {
    mount();
    for (const item of careMenu) {
      expect(screen.getByRole("option", { name: item.name })).toBeInTheDocument();
    }
    fireEvent.change(screen.getByLabelText("Dịch vụ chăm sóc"), { target: { value: "demo-hair" } });
    expect(screen.getByText("49.000 ₫")).toBeInTheDocument();
    for (const name of ["Mai Anh", "Thanh Trúc", "Minh Châu"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /Linh Anh/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Dịch vụ chăm sóc")).toHaveValue("demo-hair");
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
    // The consultation must target the same real provider-application ID used
    // in the saved booking, never the public presentation/demo identifier.
    const chat = screen.getByRole("link", { name: "Chat với KTV" });
    expect(chat).toHaveAttribute(
      "href",
      expect.stringContaining("provider=" + providers[1].chatProviderId),
    );
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
