import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  AppointmentRequestsAdmin,
  type AdminAppointmentRequest,
} from "./appointment-requests-admin";
import { DEFAULT_COMPLETION_NOTE, defaultStatusNote } from "@/shared/booking/inquiry-status";
const state = vi.hoisted(() => ({
  items: [] as AdminAppointmentRequest[],
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn(),
}));
vi.mock("./private-api", () => ({
  usePrivateData: () => ({
    data: {
      items: state.items,
      total: state.items.length,
      page: 1,
      hasMore: false,
      counts: { ALL: 1, PENDING: 1, COMPLETED: 0 },
    },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: state.refetch,
  }),
  usePrivateMutation: () => ({
    mutateAsync: state.mutateAsync,
    isPending: false,
    isError: false,
    reset: vi.fn(),
  }),
  mutationMessage: () => "Không thể lưu",
}));
beforeEach(() => {
  state.items = [
    {
      id: "abc123",
      customerId: "customer-1",
      customerName: "Nguyễn Hợp",
      providerId: "provider-1",
      providerName: "Mai Anh",
      serviceName: "Gội đầu dưỡng sinh",
      requestedAt: "2026-10-13T17:00:00.000Z",
      createdAt: "2026-10-13T16:00:00.000Z",
      updatedAt: "2026-10-13T16:00:00.000Z",
      location: "AT_BRANCH",
      address: "Cơ sở Mộc Maria",
      notes: "Nhờ tư vấn thêm về dịch vụ",
      status: "PENDING",
      allowedActions: ["CONTACTED", "DECLINED"],
    },
  ];
});
afterEach(() => {
  cleanup();
  state.mutateAsync.mockClear();
  state.refetch.mockClear();
});
function superAdmin() {
  state.items[0] = {
    ...state.items[0],
    canManageStatus: true,
    allowedActions: ["CONTACTED", "CONFIRMED", "IN_SERVICE", "COMPLETED", "DECLINED", "CANCELLED"],
  };
}
describe("Appointment admin lifecycle", () => {
  it("shows real data and completion filters while reserving full lifecycle controls for Super Admin", () => {
    render(<AppointmentRequestsAdmin />);
    expect(screen.getAllByText("Nguyễn Hợp").length).toBeGreaterThan(0);
    expect(screen.getByText("Nhờ tư vấn thêm về dịch vụ")).toBeTruthy();
    expect(screen.getByText(/trạng thái lịch không tự ghi nhận thanh toán/i)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Đã hoàn thành/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Đổi trạng thái lịch hẹn" })).toBeNull();
  });
  it("prefills an editable reason and disallows an empty reason", () => {
    render(<AppointmentRequestsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /Đã liên hệ/i }));
    const note = screen.getByLabelText(/Ghi chú xử lý/i);
    expect(note).toHaveValue(defaultStatusNote("CONTACTED"));
    const submit = screen.getByRole("button", { name: "Xác nhận xử lý" });
    expect(submit).toBeEnabled();
    fireEvent.change(note, { target: { value: "" } });
    expect(submit).toBeDisabled();
    fireEvent.change(note, { target: { value: "Đã liên hệ qua điện thoại." } });
    fireEvent.click(submit);
    expect(state.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/admin/appointment-inquiries/abc123",
        method: "PATCH",
        body: expect.objectContaining({
          status: "CONTACTED",
          reason: "Đã liên hệ qua điện thoại.",
          expectedStatus: "PENDING",
          expectedUpdatedAt: "2026-10-13T16:00:00.000Z",
        }),
      }),
    );
  });
  it("requires explicit completion confirmation and sends the frozen booking version", () => {
    superAdmin();
    state.items[0] = { ...state.items[0], appointmentId: "appointment", appointmentVersion: 4 };
    const { rerender } = render(<AppointmentRequestsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Đánh dấu đã hoàn thành lịch hẹn" }));
    expect(screen.getByLabelText(/Ghi chú xử lý/i)).toHaveValue(DEFAULT_COMPLETION_NOTE);
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "Xác nhận xử lý" });
    expect(submit).toBeDisabled();
    state.items = [{ ...state.items[0], id: "other", appointmentVersion: 5 }];
    rerender(<AppointmentRequestsAdmin />);
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(submit);
    expect(state.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/admin/appointment-inquiries/abc123",
        body: expect.objectContaining({
          status: "COMPLETED",
          expectedStatus: "PENDING",
          expectedAppointmentVersion: 4,
          servicePerformedConfirmed: true,
          reason: DEFAULT_COMPLETION_NOTE,
        }),
      }),
    );
  });
  it("allows Super Admin to reopen a terminal booking and updates the proposed note", () => {
    superAdmin();
    state.items[0] = {
      ...state.items[0],
      status: "COMPLETED",
      allowedActions: ["PENDING", "CONTACTED", "CONFIRMED", "IN_SERVICE", "DECLINED", "CANCELLED"],
    };
    render(<AppointmentRequestsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi trạng thái lịch hẹn" }));
    fireEvent.change(screen.getByLabelText("Trạng thái cần chuyển"), {
      target: { value: "CONFIRMED" },
    });
    expect(screen.getByLabelText(/Ghi chú xử lý/i)).toHaveValue(defaultStatusNote("CONFIRMED"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xử lý" }));
    expect(state.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ status: "CONFIRMED", expectedStatus: "COMPLETED" }),
      }),
    );
  });
  it("trusts the backend actual appointment status over stale metadata", () => {
    superAdmin();
    state.items[0] = {
      ...state.items[0],
      status: "COMPLETED",
      appointmentId: "official",
      appointmentVersion: 9,
      fulfillmentStatus: "CONFIRMED",
      allowedActions: ["PENDING"],
    };
    render(<AppointmentRequestsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi trạng thái lịch hẹn" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xử lý" }));
    expect(state.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          expectedStatus: "COMPLETED",
          expectedAppointmentVersion: 9,
        }),
      }),
    );
  });
});
