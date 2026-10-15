import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppointmentInquiries } from "./inquiries";

const mock = vi.hoisted(() => ({ fetch: vi.fn(), user: { id: "customer", roles: ["CUSTOMER"] } }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mock.user, authFetch: mock.fetch }),
}));
afterEach(() => {
  cleanup();
  mock.fetch.mockReset();
});

describe("inquiry loading and refresh", () => {
  it("keeps the existing request on screen during a slow refresh and a refresh failure", async () => {
    let finish!: (rows: unknown[]) => void;
    mock.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<AppointmentInquiries />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải yêu cầu đặt lịch…");
    expect(screen.queryByText("Bạn chưa có yêu cầu đặt lịch nào.")).not.toBeInTheDocument();
    await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
    await act(async () =>
      finish([
        {
          id: "request-1",
          customerId: "customer",
          customerName: "Khách",
          providerId: "provider-1",
          providerName: "KTV",
          serviceName: "Chăm sóc cổ vai gáy",
          status: "PENDING",
          location: "ON_SITE",
          address: "Tại cơ sở",
          requestedAt: "2026-10-15T12:00:00Z",
          notes: "",
        },
      ]),
    );
    expect(await screen.findByText(/Chăm sóc cổ vai gáy/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    let fail!: (error: Error) => void;
    mock.fetch.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
    expect(screen.getByRole("status")).toHaveTextContent("Đang cập nhật yêu cầu đặt lịch…");
    expect(screen.getByText(/Chăm sóc cổ vai gáy/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy yêu cầu" })).toBeDisabled();
    await act(async () => fail(new Error("offline")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa tải được yêu cầu đặt lịch");
    expect(screen.getByText(/Chăm sóc cổ vai gáy/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lại" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Hủy yêu cầu" })).toBeEnabled();
  });
});
