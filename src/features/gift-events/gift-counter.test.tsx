import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/features/auth/auth-api";
import { GiftCounter } from "./gift-counter";

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "staff" }, authFetch }),
}));
vi.mock("./gift-qr-scanner", () => ({ GiftQrScanner: () => null }));
let quoteError: Error | undefined;
let discount = 49800;
beforeEach(() => {
  quoteError = undefined;
  discount = 49800;
  authFetch.mockReset();
  authFetch.mockImplementation(async (path: string) => {
    if (path.endsWith("/branches")) return [{ id: "branch", name: "Mộc Maria" }];
    if (path.endsWith("/services"))
      return [
        {
          service: { id: "service", name: "Chăm sóc" },
          variants: [{ id: "variant", name: "60 phút", priceVnd: "249000" }],
        },
      ];
    if (path.includes("/verify"))
      return {
        rewardId: "reward",
        name: "Voucher giảm 20%",
        kind: "VOUCHER_PERCENT",
        allowedServiceIds: ["service"],
        discountPercent: 20,
        expiresAt: "2099-01-01",
        status: "ISSUED",
      };
    if (path.includes("/quote")) {
      if (quoteError) throw quoteError;
      return {
        rewardId: "reward",
        subtotalVnd: 249000,
        discountVnd: discount,
        payableVnd: 249000 - discount,
      };
    }
    if (path.includes("/redeem"))
      return { rewardId: "reward", status: "REDEEMED", redeemedAt: "2026-10-16T10:00:00Z" };
    throw new Error("Unexpected path");
  });
});
afterEach(cleanup);
async function verified(mode: "CODE" | "QR" = "CODE") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <GiftCounter />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Cơ sở nhận quà" })).toBeEnabled(),
  );
  if (mode === "QR")
    fireEvent.change(screen.getByRole("combobox", { name: "Phương thức xác minh" }), {
      target: { value: "QR" },
    });
  fireEvent.change(
    screen.getByLabelText(mode === "CODE" ? "Mã voucher 6 số" : "Mã từ thiết bị quét QR"),
    { target: { value: mode === "CODE" ? "123456" : "Q".repeat(43) } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra quyền lợi" }));
  await screen.findByRole("heading", { name: "Voucher giảm 20%" });
}
async function calculate() {
  fireEvent.click(screen.getByRole("button", { name: "Tính giảm giá từ bảng giá hiện hành" }));
  await screen.findByRole("status");
}
describe("Counter optional internal reference", () => {
  it.each(["CODE", "QR"] as const)(
    "redeems by %s after pricing with the reference left empty",
    async (mode) => {
      await verified(mode);
      expect(screen.getByRole("button", { name: "Xác nhận áp dụng voucher" })).toBeDisabled();
      await calculate();
      expect(screen.getByLabelText("Mã đối soát nội bộ (không bắt buộc)")).toHaveValue("");
      const confirm = screen.getByRole("button", { name: "Xác nhận áp dụng voucher" });
      expect(confirm).toBeEnabled();
      fireEvent.click(confirm);
      await screen.findByText("Đã xác nhận giao quà");
      const call = authFetch.mock.calls.find(([path]) =>
        path.endsWith(mode === "CODE" ? "/redeem-code" : "/redeem"),
      );
      expect(call).toBeDefined();
      const body = JSON.parse(call![1].body);
      expect(body).not.toHaveProperty("saleReference");
      expect(body.items).toEqual([{ variantId: "variant", quantity: 1 }]);
    },
  );
  it("retains an optional human-readable reference without the old format restriction", async () => {
    await verified();
    await calculate();
    fireEvent.change(screen.getByLabelText("Mã đối soát nội bộ (không bắt buộc)"), {
      target: { value: "  ca chiều 1  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận áp dụng voucher" }));
    await screen.findByText("Đã xác nhận giao quà");
    const call = authFetch.mock.calls.find(([path]) => path.endsWith("/redeem-code"));
    expect(JSON.parse(call![1].body).saleReference).toBe("ca chiều 1");
  });
  it("still blocks confirmation when the minimum spend is not met", async () => {
    discount = 0;
    await verified();
    await calculate();
    expect(screen.getByRole("button", { name: "Xác nhận áp dụng voucher" })).toBeDisabled();
  });
  it("asks for a new credential when it expires between verification and pricing", async () => {
    quoteError = new ApiError(409, "QR_EXPIRED");
    await verified();
    fireEvent.click(screen.getByRole("button", { name: "Tính giảm giá từ bảng giá hiện hành" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nhờ khách lấy mã mới");
    expect(
      screen.queryByRole("button", { name: "Xác nhận áp dụng voucher" }),
    ).not.toBeInTheDocument();
  });
});
