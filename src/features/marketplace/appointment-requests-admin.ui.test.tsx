import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppointmentRequestsAdmin } from "./appointment-requests-admin";

const mutateAsync = vi.fn().mockResolvedValue(undefined);
const refetch = vi.fn().mockResolvedValue(undefined);
vi.mock("./private-api", () => ({
  usePrivateData: () => ({
    data: {
      items: [
        {
          id: "abc123",
          customerId: "customer-1",
          customerName: "Nguyễn Hợp",
          providerId: "provider-1",
          providerName: "Mai Anh",
          serviceName: "Gội đầu dưỡng sinh",
          requestedAt: "2026-10-13T17:00:00.000Z",
          createdAt: "2026-10-13T16:00:00.000Z",
          location: "AT_BRANCH",
          address: "Cơ sở Mộc Maria",
          notes: "Nhờ tư vấn thêm về dịch vụ",
          status: "PENDING",
          allowedActions: ["CONTACTED", "DECLINED"],
        },
      ],
      total: 1,
      page: 1,
      hasMore: false,
      counts: { ALL: 1, PENDING: 1, CONTACTED: 0, DECLINED: 0, CANCELLED: 0 },
    },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch,
  }),
  usePrivateMutation: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
    reset: vi.fn(),
  }),
  mutationMessage: () => "Không thể lưu",
}));

afterEach(() => {
  cleanup();
  mutateAsync.mockClear();
  refetch.mockClear();
});

describe("Appointment admin board", () => {
  it("shows actual customer and service data and does not imply the request is confirmed", () => {
    render(<AppointmentRequestsAdmin />);
    expect(screen.getAllByText("Nguyễn Hợp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gội đầu dưỡng sinh").length).toBeGreaterThan(0);
    expect(screen.getByText(/chưa phải lịch hẹn đã được xác nhận/i)).toBeTruthy();
    expect(screen.getByText("Nhờ tư vấn thêm về dịch vụ")).toBeTruthy();
    expect(screen.queryByText("Xác nhận lịch hẹn")).toBeNull();
  });

  it("requires a reason before allowing an admin status update", async () => {
    render(<AppointmentRequestsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /Đã liên hệ/i }));
    const submit = screen.getByRole("button", { name: "Xác nhận xử lý" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Ghi chú xử lý/i), {
      target: { value: "Đã liên hệ qua điện thoại." },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);
    expect(mutateAsync).toHaveBeenCalledWith({
      path: "/admin/appointment-inquiries/abc123",
      method: "PATCH",
      body: { status: "CONTACTED", reason: "Đã liên hệ qua điện thoại." },
    });
  });
});
