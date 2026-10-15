import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftPrizesAdmin } from "./gift-prizes-admin";
import type { GiftEvent } from "./event-admin";

const state = vi.hoisted(() => ({ save: vi.fn(), fetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ authFetch: state.fetch }) }));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: (path: string) => ({
    data: path.includes("branches")
      ? [{ id: "11111111-1111-4111-8111-111111111111", name: "Cơ sở Mộc Maria", isActive: true }]
      : [],
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  }),
  usePrivateMutation: () => ({ mutateAsync: state.save, isPending: false, isError: false }),
  mutationMessage: () => "Lỗi lưu quà",
}));
const campaign = {
  id: "22222222-2222-4222-8222-222222222222",
  status: "DRAFT",
  title: "Sự kiện",
} as GiftEvent;
beforeEach(() => {
  state.save.mockReset();
  state.fetch.mockReset();
});
afterEach(() => cleanup());
describe("P06 prize settings UI", () => {
  it("requires saving campaign before inventory editor exists", () => {
    render(<GiftPrizesAdmin event={null} />);
    expect(screen.getByText(/Hãy tạo bản nháp/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm phần thưởng/ })).not.toBeInTheDocument();
  });
  it("supports active branch selection and keeps cash-disabled toggle", () => {
    render(<GiftPrizesAdmin event={campaign} />);
    fireEvent.change(screen.getByLabelText("Loại quà"), { target: { value: "CASH_COUNTER" } });
    expect(screen.getByText(/Quà tiền mặt chưa thể bật/)).toBeInTheDocument();
    const toggle = screen.getByRole("checkbox", { name: /Bật giải/ }) as HTMLInputElement;
    expect(toggle).toBeDisabled();
    const branch = screen.getByRole("checkbox", { name: "Cơ sở Mộc Maria" });
    expect(branch).not.toBeChecked();
    fireEvent.click(branch);
    expect(branch).toBeChecked();
  });
});
