import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftEventAdmin } from "./event-admin";

const mocks = vi.hoisted(() => ({ isSuper: true, mutate: vi.fn(), refetch: vi.fn() }));
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
  usePrivateData: () => ({ data: [], isPending: false, isError: false, refetch: mocks.refetch }),
  usePrivateMutation: () => ({ mutateAsync: mocks.mutate, isPending: false, isError: false }),
  mutationMessage: () => "Có lỗi",
}));

beforeEach(() => {
  mocks.isSuper = true;
  mocks.mutate.mockReset();
  mocks.mutate.mockResolvedValue({});
});
afterEach(() => cleanup());

describe("P05 event admin eligibility", () => {
  it("denies ordinary admin access even when menu was incorrectly opened", () => {
    mocks.isSuper = false;
    render(<GiftEventAdmin />);
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ Super Admin");
    expect(screen.queryByRole("button", { name: /Tạo mới/ })).not.toBeInTheDocument();
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
