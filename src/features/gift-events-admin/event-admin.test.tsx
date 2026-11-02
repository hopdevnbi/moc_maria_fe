import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftEventAdmin } from "./event-admin";

const mocks = vi.hoisted(() => ({
  isSuper: true,
  mutate: vi.fn(),
  refetch: vi.fn(),
  campaign: null as Record<string, unknown> | null,
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      roles: mocks.isSuper ? ["SUPER_ADMIN"] : ["ADMIN"],
      permissions: ["admin.portal"],
    },
  }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({
    data: mocks.campaign ? [mocks.campaign] : [],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  usePrivateMutation: () => ({ mutateAsync: mocks.mutate, isPending: false, isError: false }),
  mutationMessage: () => "Có lỗi",
}));

beforeEach(() => {
  mocks.isSuper = true;
  mocks.campaign = null;
  mocks.mutate.mockReset();
  mocks.mutate.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("P05 event admin eligibility", () => {
  it("denies ordinary admin access even when menu was incorrectly opened", () => {
    mocks.isSuper = false;
    render(<GiftEventAdmin />);
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ Super Admin");
    expect(screen.queryByRole("button", { name: /Tạo mới/ })).not.toBeInTheDocument();
  });
  it("submits the audited Noel 01/11–25/12 amendment only after Super Admin confirmation", async () => {
    mocks.campaign = {
      id: "22222222-2222-4222-8222-222222222222",
      code: "moc-maria-tri-an-thang-11-2026",
      slug: "moc-maria-tri-an-thang-11-2026",
      title: "Tháng 11 Tri Ân",
      description: "Ưu đãi tháng 11",
      termsText: "Điều lệ trước điều chỉnh",
      heroUrl: null,
      status: "LIVE",
      effectiveStatus: "LIVE",
      startAt: "2026-10-16T00:20:20.607Z",
      endAt: "2026-11-30T16:59:00.000Z",
      eligibleTiers: ["STANDARD"],
      budgetCapVnd: 15000000,
      budgetReservedVnd: 600000,
      requiresCompletedService: false,
      version: 6,
      termsVersion: 2,
    };
    mocks.mutate.mockResolvedValue(mocks.campaign);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<GiftEventAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Chuẩn bị cập nhật điều lệ Noel" }));
    const submit = screen.getByRole("button", { name: "Xác nhận cập nhật 01/11–25/12" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/), {
      target: { value: "Gia hạn sự kiện Giáng Sinh đến hết 25/12" },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        path: "/" + "admin/gift-events/22222222-2222-4222-8222-222222222222/christmas-2026-terms",
        body: {
          expectedVersion: 6,
          reason: "Gia hạn sự kiện Giáng Sinh đến hết 25/12",
        },
      }),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it("defaults to only THƯỜNG and chooses specific VIP levels, never broadens VIP automatically", () => {
    render(<GiftEventAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /03 · Hạng khách/ }));
    const standard = screen.getByRole("checkbox", { name: /THƯỜNG/ }) as HTMLInputElement;
    expect(standard).toBeChecked();
    fireEvent.change(screen.getByLabelText("Chọn hạng VIP"), { target: { value: "VIP2" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm hạng" }));
    expect(screen.getByRole("button", { name: /VIP2/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /VIP1 ×/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /VIP3 ×/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Yêu cầu đã từng sử dụng dịch vụ/ }),
    ).not.toBeChecked();
  });
});
