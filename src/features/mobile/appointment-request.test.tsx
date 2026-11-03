import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { AppointmentRequest } from "./appointment-request";
import demoProviders from "./demo-ktvs.json";
import demoServices from "./demo-services.json";
import { careMenu } from "./official-menu";
import { officialKtvProfiles } from "./official-ktv-roster";
const state = vi.hoisted(() => ({
  fetch: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
  guest: false,
}));
const customerAuth = {
  accessToken: "new-customer-access",
  user: { id: "customer", permissions: ["customer.portal"] },
};
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: state.guest ? null : { id: "customer", permissions: ["customer.portal"] },
    status: state.guest ? "anonymous" : "authenticated",
    authFetch: state.fetch,
    register: state.register,
    login: state.login,
  }),
}));
vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
vi.mock("next/image", () => ({
  default: ({
    unoptimized: _u,
    fill: _fill,
    ...props
  }: React.ComponentProps<"img"> & { unoptimized?: boolean; fill?: boolean }) => (
    <img {...props} alt={props.alt || ""} />
  ),
}));
beforeEach(() => {
  state.guest = false;
  state.fetch.mockReset().mockResolvedValue({ id: "inquiry" });
  state.register.mockReset().mockImplementation(async () => {
    state.guest = false;
    return customerAuth;
  });
  state.login.mockReset().mockImplementation(async () => {
    state.guest = false;
    return customerAuth;
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
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

function guestBooking() {
  state.guest = true;
  render(
    <AppointmentRequest
      providers={providers}
      services={demoServices}
      initial={{ provider: providers[0].id }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục đặt lịch" }));
  return screen.getByRole("dialog", { name: "Chỉ còn một bước nhỏ" });
}
function fillSignup(dialog: HTMLElement) {
  const form = within(dialog);
  fireEvent.change(form.getByLabelText("Họ và tên"), { target: { value: "Khách kiểm thử" } });
  fireEvent.change(form.getByLabelText("Số điện thoại"), { target: { value: "0900000000" } });
  fireEvent.change(form.getByLabelText("Mật khẩu", { exact: true }), {
    target: { value: "PrivatePass123" },
  });
}
const inquiryResponse = () =>
  new Response(JSON.stringify({ id: "qa-inquiry", status: "PENDING" }), {
    headers: { "Content-Type": "application/json" },
  });
describe("guest quick booking", () => {
  it("registers inline and sends exactly once with the returned access token, preserving the complete selection", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    let complete!: (response: Response) => void;
    network.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const dialog = guestBooking();
    const pageTime = (
      screen.getByLabelText("Ngày & giờ mong muốn (giờ Hà Nội)") as HTMLInputElement
    ).value;
    expect(within(dialog).getByText(providers[0].publicName)).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
    fillSignup(dialog);
    const form = dialog.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(network).toHaveBeenCalledTimes(1));
    expect(state.register).toHaveBeenCalledTimes(1);
    expect(state.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Đã gửi yêu cầu đến/)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Đang gửi yêu cầu…")).toBeInTheDocument();
    const [url, init] = network.mock.calls[0];
    expect(String(url)).toMatch(/\/appointment-inquiries$/);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer new-customer-access");
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      providerId: providers[0].chatProviderId,
      location: "AT_BRANCH",
      requestedAt: new Date(pageTime + ":00+07:00").toISOString(),
    });
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(body)).not.toContain("PrivatePass123");
    expect(sessionStorage.length).toBe(0);
    await act(async () => complete(inquiryResponse()));
    await screen.findByText("Đã gửi yêu cầu đến " + providers[0].publicName);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("keeps the modal and selection when signup fails, then lets an existing customer log in without navigation", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockResolvedValue(inquiryResponse());
    state.register.mockRejectedValue(new Error("Email hoặc số điện thoại đã được sử dụng."));
    const dialog = guestBooking();
    fillSignup(dialog);
    fireEvent.submit(dialog.querySelector("form")!);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("đã được sử dụng");
    expect(network).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Họ và tên")).toHaveValue("Khách kiểm thử");
    fireEvent.click(within(dialog).getByRole("button", { name: "Đăng nhập" }));
    expect(within(dialog).getByLabelText("Số điện thoại hoặc email")).toHaveValue("0900000000");
    fireEvent.change(within(dialog).getByLabelText("Mật khẩu", { exact: true }), {
      target: { value: "ExistingPass123" },
    });
    fireEvent.submit(dialog.querySelector("form")!);
    await screen.findByText("Đã gửi yêu cầu đến " + providers[0].publicName);
    expect(state.login).toHaveBeenCalledWith({
      identifier: "0900000000",
      password: "ExistingPass123",
    });
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("retains a registered customer's booking after a network failure and retries with the original idempotency key", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Mạng bị gián đoạn"));
    const dialog = guestBooking();
    fillSignup(dialog);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("Mạng bị gián đoạn");
    expect(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" }));
    await screen.findByText("Đã gửi yêu cầu đến " + providers[0].publicName);
    const firstBody = JSON.parse(network.mock.calls[0][1]?.body as string);
    const retryBody = JSON.parse(state.fetch.mock.calls[0][1].body);
    expect(retryBody).toEqual(firstBody);
    expect(state.register).toHaveBeenCalledTimes(1);
  });
  it("closes safely without registering or losing the customer's home-address draft", () => {
    state.guest = true;
    render(
      <AppointmentRequest
        providers={providers}
        services={demoServices}
        initial={{ provider: providers[0].id }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tại địa chỉ của tôi" }));
    expect(screen.getByRole("button", { name: "Tiếp tục đặt lịch" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Địa chỉ nhận dịch vụ"), {
      target: { value: "12 Nguyễn Trãi, Hà Nội" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục đặt lịch" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng đăng ký nhanh" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Địa chỉ nhận dịch vụ")).toHaveValue("12 Nguyễn Trãi, Hà Nội");
    expect(state.register).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("uses the same password rules as normal registration and supports email instead of phone", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(inquiryResponse());
    const dialog = guestBooking();
    fillSignup(dialog);
    fireEvent.change(within(dialog).getByLabelText("Mật khẩu", { exact: true }), {
      target: { value: "weakpassword" },
    });
    fireEvent.submit(dialog.querySelector("form")!);
    await within(dialog).findByText("Cần có chữ hoa.");
    expect(state.register).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Dùng email" }));
    fireEvent.change(within(dialog).getByLabelText("Email", { exact: true }), {
      target: { value: "qa@example.test" },
    });
    fireEvent.change(within(dialog).getByLabelText("Mật khẩu", { exact: true }), {
      target: { value: "PrivatePass123" },
    });
    fireEvent.submit(dialog.querySelector("form")!);
    await screen.findByText("Đã gửi yêu cầu đến " + providers[0].publicName);
    expect(state.register).toHaveBeenCalledWith({
      displayName: "Khách kiểm thử",
      email: "qa@example.test",
      phone: undefined,
      password: "PrivatePass123",
    });
  });
  it("revalidates the time after signup instead of silently sending an expired request", async () => {
    const start = Date.parse("2026-11-02T03:00:00Z");
    const clock = vi.spyOn(Date, "now").mockReturnValue(start);
    const network = vi.spyOn(globalThis, "fetch").mockResolvedValue(inquiryResponse());
    const dialog = guestBooking();
    fillSignup(dialog);
    clock.mockReturnValue(start + 2 * 3600000);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("kiểm tra lại");
    expect(network).not.toHaveBeenCalled();
    expect(screen.queryByText(/Đã gửi yêu cầu đến/)).not.toBeInTheDocument();
  });
});

const rosterProviders = officialKtvProfiles(providers);
const officialCareServices = careMenu.map((care, index) => ({
  service: {
    ...demoServices[index].service,
    id: "11111111-2222-4333-8444-" + String(index + 1).padStart(12, "0"),
    slug: care.slug,
    name: care.name,
    isPublished: true,
  },
  variants: [
    { ...demoServices[index].variants[0], isActive: true, priceVnd: String(care.priceVnd) },
  ],
}));

describe("official service to all seven KTV inquiry flow", () => {
  it("shows seven real portraits, deduplicates legacy services and excludes drinks", () => {
    const drink = {
      ...officialCareServices[0],
      service: {
        ...officialCareServices[0].service,
        id: "drink",
        name: "Trà thảo mộc",
        slug: "tra-thao-moc",
      },
    };
    render(
      <AppointmentRequest
        providers={rosterProviders}
        services={[...officialCareServices, ...demoServices, drink]}
        initial={{ service: officialCareServices[0].service.id }}
      />,
    );
    const picker = screen.getByRole("group", { name: "Danh sách kỹ thuật viên" });
    expect(within(picker).getAllByRole("button")).toHaveLength(7);
    expect(picker.querySelectorAll("img")).toHaveLength(7);
    expect(within(screen.getByLabelText("Dịch vụ chăm sóc")).getAllByRole("option")).toHaveLength(
      11,
    );
    expect(screen.queryByRole("option", { name: "Trà thảo mộc" })).not.toBeInTheDocument();
  });
  it.each(rosterProviders)(
    "keeps the official service while selecting and sending to $publicName",
    async (provider) => {
      render(
        <AppointmentRequest
          providers={rosterProviders}
          services={[...officialCareServices, ...demoServices]}
          initial={{ service: officialCareServices[0].service.id }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: new RegExp(provider.publicName) }));
      expect(screen.getByLabelText("Dịch vụ chăm sóc")).toHaveValue(
        officialCareServices[0].service.id,
      );
      fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu đặt lịch" }));
      await screen.findByText("Đã gửi yêu cầu đến " + provider.publicName);
      const payload = JSON.parse(state.fetch.mock.calls[0][1].body);
      expect(payload).toMatchObject({
        providerId: provider.chatProviderId,
        serviceId: officialCareServices[0].service.id,
      });
    },
  );
  it("keeps selected KTV when switching official services and can recover an empty search", () => {
    render(
      <AppointmentRequest
        providers={rosterProviders}
        services={[...officialCareServices, ...demoServices]}
        initial={{ service: officialCareServices[0].service.id }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Nguyễn Hoàn/ }));
    fireEvent.change(screen.getByLabelText("Dịch vụ chăm sóc"), {
      target: { value: officialCareServices[1].service.id },
    });
    expect(screen.getByRole("button", { name: /Nguyễn Hoàn/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByLabelText("Tìm kỹ thuật viên"), {
      target: { value: "khongkhop" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Chưa tìm thấy KTV");
    fireEvent.click(screen.getByRole("button", { name: "Xem tất cả KTV" }));
    expect(
      within(screen.getByRole("group", { name: "Danh sách kỹ thuật viên" })).getAllByRole("button"),
    ).toHaveLength(7);
  });
  it("resolves existing legacy service links to the published catalog ID", () => {
    render(
      <AppointmentRequest
        providers={rosterProviders}
        services={[...officialCareServices, ...demoServices]}
        initial={{ provider: rosterProviders[0].id, service: "demo-relaxation" }}
      />,
    );
    expect(screen.getByLabelText("Dịch vụ chăm sóc")).toHaveValue(
      officialCareServices[0].service.id,
    );
  });
});
