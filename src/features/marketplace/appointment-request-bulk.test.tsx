import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAppointmentRequest } from "./appointment-requests-admin";
import {
  AppointmentBulkSelection,
  AppointmentBulkCheckbox,
  AppointmentBulkToolbar,
} from "./appointment-request-bulk";
import { DEFAULT_COMPLETION_NOTE } from "@/shared/booking/inquiry-status";

const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin" }, authFetch: state.fetch }),
}));
const first: AdminAppointmentRequest = {
  id: "a",
  customerId: "customer",
  customerName: "Khách kiểm tra A",
  providerId: "provider",
  providerName: "KTV kiểm tra",
  serviceName: "Dịch vụ kiểm tra",
  requestedAt: "2026-11-03T08:00:00Z",
  createdAt: "2026-11-02T08:00:00Z",
  updatedAt: "2026-11-02T09:00:00Z",
  status: "PENDING",
  allowedActions: ["CONTACTED", "COMPLETED"],
  appointmentVersion: 4,
  location: "AT_BRANCH",
  address: "Cơ sở kiểm tra",
  notes: "",
};
const second = { ...first, id: "b", customerName: "Khách kiểm tra B", appointmentVersion: 8 };
function mount(records = [first, second]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = (rows: AdminAppointmentRequest[], scope = "page-1", disabled = false) => (
    <QueryClientProvider client={client}>
      <AppointmentBulkSelection records={rows} scope={scope} disabled={disabled}>
        <AppointmentBulkToolbar />
        {rows.map((record) => (
          <AppointmentBulkCheckbox key={record.id} record={record} />
        ))}
      </AppointmentBulkSelection>
    </QueryClientProvider>
  );
  const result = render(view(records));
  return {
    ...result,
    invalidate,
    refresh: (rows: AdminAppointmentRequest[], scope = "page-1", disabled = false) =>
      result.rerender(view(rows, scope, disabled)),
  };
}
function begin(status = "CONTACTED") {
  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả lịch trên trang" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Trạng thái cập nhật hàng loạt" }), {
    target: { value: status },
  });
  const apply = screen.getByRole("button", { name: "Cập nhật 2 lịch" });
  apply.focus();
  fireEvent.click(apply);
}
beforeEach(() => {
  state.fetch.mockReset().mockResolvedValue(undefined);
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
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("appointment bulk selection and confirmation", () => {
  it("selects individual rows, shows partial selection, and clears selection when changing filters or pages", () => {
    const { refresh } = mount();
    const all = screen.getByRole("checkbox", { name: "Chọn tất cả lịch trên trang" });
    fireEvent.click(screen.getByRole("checkbox", { name: /Khách kiểm tra A/ }));
    expect(all).toBePartiallyChecked();
    expect(screen.getByText("Đã chọn 1 lịch")).toBeInTheDocument();
    refresh([first, second], "page-2");
    expect(all).not.toBeChecked();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    refresh([first, second], "page-1");
    expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
  });

  it("does not select readonly or archived records and blocks an incompatible group target", () => {
    mount([
      first,
      { ...second, allowedActions: ["COMPLETED"] },
      { ...second, id: "c", allowedActions: [] },
      { ...second, id: "d", archivedAt: first.updatedAt },
    ]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả lịch trên trang" }));
    expect(screen.getByText("Đã chọn 2 lịch")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Đang trao đổi" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Đã hoàn thành" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /\(c\)/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /\(d\)/ })).toBeDisabled();
  });

  it("freezes both expected versions and requires explicit completion confirmation before any write", async () => {
    const { refresh, invalidate } = mount();
    begin("COMPLETED");
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "Xác nhận cập nhật 2 lịch" });
    expect(submit).toBeDisabled();
    expect(screen.getByLabelText(/Ghi chú chung/)).toHaveValue(DEFAULT_COMPLETION_NOTE);
    refresh([
      { ...first, appointmentVersion: 99 },
      { ...second, updatedAt: "2026-11-03T10:00:00Z" },
    ]);
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(submit);
    await screen.findByText("Đã cập nhật 2/2 lịch.");
    expect(
      state.fetch.mock.calls.map(([path, init]) => [
        path,
        JSON.parse(init.body).expectedAppointmentVersion,
        JSON.parse(init.body).expectedUpdatedAt,
        JSON.parse(init.body).servicePerformedConfirmed,
      ]),
    ).toEqual([
      ["/admin/appointment-inquiries/a", 4, first.updatedAt, true],
      ["/admin/appointment-inquiries/b", 8, second.updatedAt, true],
    ]);
    expect(invalidate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Đóng kết quả" }));
    expect(screen.getByRole("checkbox", { name: "Chọn tất cả lịch trên trang" })).toHaveFocus();
  });

  it("blocks duplicate submits, displays progress and keeps only unconfirmed rows selected", async () => {
    let finish!: () => void;
    state.fetch.mockImplementation((path: string) =>
      path.endsWith("/a")
        ? new Promise<void>((resolve) => {
            finish = resolve;
          })
        : Promise.reject(new Error("conflict")),
    );
    mount();
    begin();
    const submit = screen.getByRole("button", { name: "Xác nhận cập nhật 2 lịch" });
    fireEvent.click(submit);
    fireEvent.submit(submit.closest("form")!);
    await waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(2));
    expect(submit).toBeDisabled();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => finish());
    await screen.findByText("Đã cập nhật 1/2 lịch.");
    expect(screen.getByRole("alert")).toHaveTextContent("1 lịch chưa xác nhận cập nhật");
    fireEvent.click(screen.getByRole("button", { name: "Đóng kết quả" }));
    expect(screen.getByRole("checkbox", { name: /Khách kiểm tra A/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Khách kiểm tra B/ })).toBeChecked();
    expect(state.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps selection disabled during refresh and leaves data unchanged on confirmation cancel", () => {
    const { refresh } = mount();
    refresh([first, second], "page-1", true);
    expect(screen.getByRole("checkbox", { name: "Chọn tất cả lịch trên trang" })).toBeDisabled();
    refresh([first, second]);
    begin();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.fetch).not.toHaveBeenCalled();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
