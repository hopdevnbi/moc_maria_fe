import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { TechnicianWorkspace } from "./ktv-workspace";
import type { Inquiry } from "./inquiries";
import { DEFAULT_COMPLETION_NOTE } from "@/shared/booking/inquiry-status";
const auth = vi.hoisted(() => ({
  user: {
    id: "ktv",
    displayName: "Linh Anh",
    email: "ktv@example.test",
    phone: null,
    roles: ["THERAPIST"],
    permissions: [] as string[],
    mustChangePassword: false,
  },
  fetch: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: auth.user,
    authFetch: auth.fetch,
    logout: auth.logout,
    logoutAll: auth.logoutAll,
  }),
}));
vi.mock("@/features/marketplace/provider-planning", () => ({
  OwnProviderPlanning: () => <p>Ca làm của KTV</p>,
}));
vi.mock("@/features/auth/components/ChangePasswordForm", () => ({
  ChangePasswordForm: () => <h2>Đổi mật khẩu</h2>,
}));
vi.mock("./profile-editor", () => ({
  ProviderDescriptionEditor: () => <h2>Giới thiệu của bạn</h2>,
}));
let client: QueryClient, items: Inquiry[];
const officialId = "c".repeat(64);
const make = (id: string, status: string, name: string): Inquiry => ({
  id: id.repeat(64),
  status,
  customerId: "customer-" + id,
  customerName: name,
  providerId: "provider",
  providerName: "Linh Anh",
  serviceId: "demo-relaxation",
  serviceName: "Chăm sóc",
  location: "AT_BRANCH",
  address: "Cơ sở Mộc Maria",
  requestedAt: new Date(Date.now() - 3600000).toISOString(),
  notes: "",
});
beforeEach(() => {
  auth.user.roles = ["THERAPIST"];
  auth.logout.mockReset();
  auth.logoutAll.mockReset();
  items = [
    make("a", "CONTACTED", "Khách An"),
    make("b", "PENDING", "Khách Bình"),
    { ...make("c", "CONTACTED", "Khách Chi"), appointmentId: "official" },
    { ...make("d", "CONTACTED", "Khách Dung"), providerCompletedAt: new Date().toISOString() },
  ];
  auth.fetch.mockReset().mockImplementation((path: string, init?: RequestInit) => {
    if (path === "/appointment-inquiries") return Promise.resolve(items);
    if (path === "/provider/inquiry-fulfillments")
      return Promise.resolve([
        {
          inquiryId: officialId,
          status: "IN_SERVICE",
          version: 2,
          startsAt: new Date(Date.now() - 7200000).toISOString(),
          endsAt: new Date(Date.now() - 60000).toISOString(),
        },
      ]);
    if (path === "/ktv-chat/threads") return Promise.resolve([{ unread_count: 3 }]);
    if (init?.method === "POST") {
      const id = path.split("/")[3];
      const updated = { providerCompletedAt: new Date().toISOString() };
      items = items.map((i) => (i.id === id ? { ...i, ...updated } : i));
      return Promise.resolve({ inquiryId: id, ...updated });
    }
    if (init?.method === "PATCH") return Promise.resolve({ status: "COMPLETED", version: 3 });
    return Promise.reject(Error("Unexpected fixture API"));
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});
function mount() {
  return render(
    <QueryClientProvider client={client}>
      <TechnicianWorkspace />
    </QueryClientProvider>,
  );
}
describe("KTV working dashboard", () => {
  it("shows live work, search, completed filters and compact personal panels", async () => {
    mount();
    await screen.findByText("Khách An");
    expect(screen.queryByText("Khách Dung")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tìm khách hàng hoặc dịch vụ"), {
      target: { value: "khach binh" },
    });
    expect(screen.getByText("Khách Bình")).toBeInTheDocument();
    expect(screen.queryByText("Khách An")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tìm khách hàng hoặc dịch vụ"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đã xong" }));
    expect(screen.getByText("Khách Dung")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hồ sơ của tôi" }));
    expect(screen.getByText("Giới thiệu của bạn")).toBeInTheDocument();
    expect(screen.queryByText("Ca làm của KTV")).not.toBeInTheDocument();
  });
  it("requires explicit attestation before reporting completion and persists the changed display", async () => {
    mount();
    await screen.findByText("Khách An");
    const card = screen.getByText("Khách An").closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Đánh dấu đã hoàn thành" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("textbox")).toHaveValue(DEFAULT_COMPLETION_NOTE);
    expect(within(dialog).getByRole("button", { name: "Xác nhận đã hoàn thành" })).toBeDisabled();
    expect(dialog).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận đã hoàn thành" }));
    await screen.findByText("Đã cập nhật hoàn thành buổi chăm sóc.");
    const call = auth.fetch.mock.calls.find(
      ([path, init]) =>
        path.includes("/provider/appointment-inquiries/") && init?.method === "POST",
    );
    expect(call).toBeDefined();
    expect(JSON.parse(call![1].body)).toMatchObject({
      servicePerformedConfirmed: true,
      reason: DEFAULT_COMPLETION_NOTE,
    });
    expect(auth.fetch.mock.calls.some(([path]) => path.includes("/admin/"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Đã xong" }));
    expect(screen.getByText("Khách An")).toBeInTheDocument();
  });
  it("uses the official appointment version when completing a service in progress", async () => {
    mount();
    await screen.findByText("Khách Chi");
    const card = screen.getByText("Khách Chi").closest("article")!;
    await waitFor(() =>
      expect(within(card).getByRole("button", { name: "Đánh dấu đã hoàn thành" })).toBeEnabled(),
    );
    fireEvent.click(within(card).getByRole("button", { name: "Đánh dấu đã hoàn thành" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đã hoàn thành" }));
    await waitFor(() =>
      expect(
        auth.fetch.mock.calls.some(
          ([path, init]) =>
            path === "/provider/inquiry-fulfillments/" + officialId + "/status" &&
            JSON.parse(init.body).expectedVersion === 2,
        ),
      ).toBe(true),
    );
  });
  it("keeps server errors visible and does not report success or discard the confirmation", async () => {
    const original = auth.fetch.getMockImplementation()!;
    auth.fetch.mockImplementation((path, init) =>
      init?.method === "POST"
        ? Promise.reject(Error("Lịch đã thay đổi, hãy tải lại."))
        : original(path, init),
    );
    mount();
    await screen.findByText("Khách An");
    fireEvent.click(
      within(screen.getByText("Khách An").closest("article")!).getByRole("button", {
        name: "Đánh dấu đã hoàn thành",
      }),
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đã hoàn thành" }));
    await waitFor(() =>
      expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(
        "Lịch đã thay đổi",
      ),
    );
    expect(screen.queryByText("Đã cập nhật hoàn thành buổi chăm sóc.")).not.toBeInTheDocument();
  });
  it("has a direct logout and never loads provider data for a customer role", async () => {
    mount();
    await screen.findByText("Khách An");
    fireEvent.click(screen.getByRole("button", { name: /^Đăng xuất$/ }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
    cleanup();
    auth.user.roles = ["CUSTOMER"];
    auth.fetch.mockClear();
    mount();
    expect(screen.queryByText("Công việc của bạn")).not.toBeInTheDocument();
    expect(auth.fetch).not.toHaveBeenCalled();
  });
});
