import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZaloBotAdmin } from "./zalo-bot-admin";
const state = vi.hoisted(() => ({
  save: vi.fn(),
  refetch: vi.fn(),
  data: {
    botConfigured: true,
    webhookConfigured: true,
    recipientCount: 0,
    lastWebhookAt: null,
    deliveries: [],
  },
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({ data: state.data, refetch: state.refetch }),
  usePrivateMutation: () => ({ mutateAsync: state.save }),
  mutationMessage: () => "Kết nối chưa hoàn tất",
}));
afterEach(cleanup);
beforeEach(() => {
  state.save.mockReset();
  state.refetch.mockClear();
  state.data.recipientCount = 0;
});
describe("Zalo operator setup", () => {
  it("explains the phone steps and prevents sending before a recipient is connected", () => {
    render(<ZaloBotAdmin />);
    expect(screen.getByRole("button", { name: "Gửi thông báo kiểm tra" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gửi báo cáo chat ngay" })).toBeDisabled();
    expect(screen.getByText(/Mỗi mã dùng một lần/)).toBeInTheDocument();
  });
  it("generates a copyable one-time command and refreshes status on demand", async () => {
    state.save.mockResolvedValue({
      command: "Kết nối Mộc Maria 0123456789ABCDEF",
      expiresAt: "2026-10-14T06:00:00Z",
    });
    render(<ZaloBotAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo mã kết nối" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Dòng cần gửi vào Bot")).toHaveValue(
        "Kết nối Mộc Maria 0123456789ABCDEF",
      ),
    );
    expect(state.save).toHaveBeenCalledWith({ path: "/admin/zalo-bot/pairing" });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra trạng thái" }));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });
  it("lets the admin test transport separately from collecting real changed threads", async () => {
    state.data.recipientCount = 1;
    state.save.mockResolvedValue({});
    render(<ZaloBotAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi thông báo kiểm tra" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith({ path: "/admin/zalo-bot/test" }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi báo cáo chat ngay" }));
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({ path: "/admin/chat-digest/run" }),
    );
  });
});
