import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvAccountAdmin } from "./ktv-account-admin";

const state = vi.hoisted(() => ({
  authFetch: vi.fn(),
  refetch: vi.fn(),
  isSuperAdmin: true,
}));

const providerId = "21e65b23-14f2-471a-9974-50d9dc5e7cbc";
const account = {
  providerId,
  userId: "5eb35fd3-3d44-4ae6-9a7a-4dfe35ab2437",
  displayName: "Thanh Thanh",
  email: "thanh.old@mocmaria.com",
  phone: null,
  isActive: true,
  mustChangePassword: true,
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin", roles: state.isSuperAdmin ? ["SUPER_ADMIN"] : ["ADMIN"] },
    authFetch: state.authFetch,
  }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({
    data: account,
    isPending: false,
    isError: false,
    refetch: state.refetch,
  }),
  mutationMessage: () => "Không thể lưu thay đổi",
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.isSuperAdmin = true;
  state.authFetch.mockResolvedValue(account);
  state.refetch.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("Super Admin account editor", () => {
  it("allows saving a new login and password without affecting KTV application ID", async () => {
    render(<KtvAccountAdmin providerId={providerId} />);
    expect(screen.getByLabelText("Email / tên đăng nhập")).toHaveValue(account.email);
    fireEvent.change(screen.getByLabelText("Email / tên đăng nhập"), {
      target: { value: "thanh.thanh@mocmaria.com" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "Another.Valid.Password123!" },
    });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
      target: { value: "Another.Valid.Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tài khoản & bảo mật" }));
    await waitFor(() => expect(state.authFetch).toHaveBeenCalledTimes(1));
    const [path, options] = state.authFetch.mock.calls[0];
    expect(path).toBe(`/admin/provider-display/ktv/${providerId}/account`);
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toMatchObject({
      email: "thanh.thanh@mocmaria.com",
      password: "Another.Valid.Password123!",
      mustChangePassword: false,
    });
    expect(JSON.parse(options.body).userId).toBeUndefined();
    expect(state.refetch).toHaveBeenCalled();
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveValue("");
    expect(screen.getByText(/Tất cả phiên đăng nhập cũ/)).toBeVisible();
  });

  it("rejects passwords that do not match before calling the API", () => {
    render(<KtvAccountAdmin providerId={providerId} />);
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "Another.Valid.Password123!" },
    });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
      target: { value: "Different.Valid.Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tài khoản & bảo mật" }));
    expect(screen.getByRole("alert")).toHaveTextContent("không khớp");
    expect(state.authFetch).not.toHaveBeenCalled();
  });

  it("hides the editor from a regular Admin", () => {
    state.isSuperAdmin = false;
    render(<KtvAccountAdmin providerId={providerId} />);
    expect(screen.queryByText("Tài khoản & bảo mật")).not.toBeInTheDocument();
    expect(state.authFetch).not.toHaveBeenCalled();
  });
});
