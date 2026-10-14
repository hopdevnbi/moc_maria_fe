import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderDisplayAdmin } from "./provider-display-admin";

const state = vi.hoisted(() => ({
  fetch: vi.fn(),
  cache: vi.fn(),
  refetch: vi.fn(),
  rows: [
    {
      id: "a",
      publicName: "Linh Anh",
      serviceArea: "Hà Nội",
      visibility: "VISIBLE",
      publishable: true,
      age: 22,
      yearsExperience: 3,
    },
    {
      id: "b",
      publicName: "Mai Anh",
      serviceArea: "Hà Nội",
      visibility: "VISIBLE",
      publishable: true,
      age: 23,
      yearsExperience: 2,
    },
    {
      id: "c",
      publicName: "Thu Hà",
      serviceArea: "Hà Nội",
      visibility: "HIDDEN",
      publishable: true,
    },
  ],
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin" }, authFetch: state.fetch }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ setQueryData: state.cache }) }));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({
    data: { version: 7, rows: state.rows },
    refetch: state.refetch,
    isError: false,
    isPending: false,
  }),
  mutationMessage: () => "Danh sách đã thay đổi",
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.fetch.mockResolvedValue({ version: 8, rows: state.rows });
});
describe("Homepage KTV management", () => {
  it("previews ordering and saves the complete list with its original version", async () => {
    render(<ProviderDisplayAdmin />);
    expect(screen.getByRole("button", { name: "Lưu thứ tự" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Đưa Mai Anh lên một vị trí" }));
    expect(screen.getByLabelText("Vị trí của Mai Anh")).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Sửa thông tin Mai Anh" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu thứ tự" }));
    await waitFor(() => expect(state.fetch).toHaveBeenCalled());
    expect(JSON.parse(state.fetch.mock.calls[0][1].body)).toEqual({
      expectedVersion: 7,
      providerIds: ["b", "a", "c"],
    });
  });
  it("preserves the proposed order when a concurrent save is rejected", async () => {
    state.fetch.mockRejectedValue(new Error("conflict"));
    render(<ProviderDisplayAdmin />);
    fireEvent.change(screen.getByLabelText("Vị trí của Mai Anh"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thứ tự" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Vị trí của Mai Anh")).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Lưu thứ tự" })).toBeEnabled();
  });
  it("requires explicit delete confirmation and can cancel without writing", () => {
    render(<ProviderDisplayAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Xóa Linh Anh khỏi danh sách" }));
    expect(screen.getByRole("dialog", { name: "Xóa Linh Anh?" })).toBeVisible();
    expect(state.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Giữ lại" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("edits actual display fields and posts numeric values", async () => {
    render(<ProviderDisplayAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Sửa thông tin Linh Anh" }));
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Linh Anh mới" } });
    fireEvent.change(screen.getByLabelText("Tuổi"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thông tin" }));
    await waitFor(() => expect(state.fetch).toHaveBeenCalled());
    expect(JSON.parse(state.fetch.mock.calls[0][1].body)).toMatchObject({
      expectedVersion: 7,
      publicName: "Linh Anh mới",
      age: 25,
      yearsExperience: 3,
    });
  });
});
