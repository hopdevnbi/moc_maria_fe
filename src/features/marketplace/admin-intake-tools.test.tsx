import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminIntakeTools } from "./admin-intake-tools";

const mocks = vi.hoisted(() => ({
  superAdmin: true,
  mutation: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", roles: mocks.superAdmin ? ["SUPER_ADMIN"] : ["ADMIN"] },
  }),
}));
vi.mock("./private-api", () => ({
  usePrivateData: () => ({
    data: {
      customers: [
        { id: "customer-1", displayName: "Khách có sẵn", email: "a@example.com", phone: null },
      ],
      providers: [
        {
          id: "ktv-1",
          publicName: "Thu Hà",
          services: [{ id: "massage-1", name: "Massage thảo dược" }],
        },
      ],
    },
    refetch: mocks.refetch,
    isError: false,
  }),
  usePrivateMutation: () => ({
    mutateAsync: mocks.mutation,
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  mutationMessage: () => "Có lỗi",
}));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminIntakeTools />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  mocks.superAdmin = true;
  mocks.mutation.mockReset().mockResolvedValue({
    customer: {
      id: "new-customer",
      displayName: "Khách mới",
      email: "new@example.com",
      phone: null,
    },
    mustChangePassword: true,
    temporaryPassword: "Mm9-ExampleTemporaryPassword",
    emailStatus: "QUEUED",
  });
});
afterEach(() => cleanup());

describe("Super Admin intake tools", () => {
  it("is invisible to ordinary Admin accounts", () => {
    mocks.superAdmin = false;
    mount();
    expect(screen.queryByText("Tiếp nhận & cấp tài khoản nhanh")).not.toBeInTheDocument();
  });
  it("creates a customer and shows the one-time temporary credential", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản khách" }));
    fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Khách mới" } });
    fireEvent.change(screen.getByLabelText("Email đăng nhập"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản an toàn" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith({
        path: "/admin/intake/customers",
        method: "POST",
        body: {
          displayName: "Khách mới",
          email: "new@example.com",
          phone: undefined,
          sendEmail: true,
        },
      }),
    );
    expect(await screen.findByText(/Mật khẩu tạm \(chỉ hiển thị một lần\)/)).toBeInTheDocument();
    expect(screen.getByText(/đã vào hàng đợi gửi/)).toBeInTheDocument();
  });
});
