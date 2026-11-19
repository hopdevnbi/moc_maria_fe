import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CatalogTranslationAdmin } from "./catalog-translation-admin";
const mocks = vi.hoisted(() => ({ roles: ["SUPER_ADMIN"], query: vi.fn(), mutate: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { roles: mocks.roles } }),
}));
vi.mock("./private-api", () => ({
  usePrivateData: (path: string) => mocks.query(path),
  usePrivateMutation: () => ({ mutateAsync: mocks.mutate, isPending: false }),
}));
afterEach(() => {
  cleanup();
  mocks.query.mockReset();
  mocks.mutate.mockReset();
  mocks.roles = ["SUPER_ADMIN"];
});
it("blocks non-super-admin before starting private requests", () => {
  mocks.roles = ["ADMIN"];
  render(<CatalogTranslationAdmin />);
  expect(screen.getByRole("alert")).toHaveTextContent("Chỉ Super Admin");
  expect(mocks.query).not.toHaveBeenCalled();
});
it("submits a reviewed translation using source fingerprint and expected version", async () => {
  const source = { name: "Massage chân", description: "Mô tả gốc" };
  mocks.query.mockImplementation((path: string) => ({
    data:
      path === "/admin/services"
        ? [{ id: "s1", name: source.name }]
        : path.includes("catalog-translations")
          ? {
              entityId: "s1",
              kind: "service",
              locale: "en",
              source,
              sourceFingerprint: "a".repeat(64),
              version: 0,
              translation: null,
            }
          : [],
    isPending: false,
    isError: false,
    isFetching: false,
  }));
  mocks.mutate.mockResolvedValue({ version: 1, status: "PUBLISHED" });
  render(<CatalogTranslationAdmin />);
  fireEvent.change(screen.getByLabelText("Chọn nội dung"), { target: { value: "s1" } });
  const names = screen.getAllByLabelText("Tên");
  expect(names[0]).toHaveAttribute("readonly");
  fireEvent.change(names[1], { target: { value: "Foot massage" } });
  fireEvent.click(screen.getByRole("button", { name: "Xuất bản" }));
  await waitFor(() =>
    expect(mocks.mutate).toHaveBeenCalledWith({
      path: "/admin/catalog-translations/service/s1/en",
      method: "PUT",
      body: {
        name: "Foot massage",
        description: null,
        status: "PUBLISHED",
        expectedVersion: 0,
        sourceFingerprint: "a".repeat(64),
      },
    }),
  );
  expect(await screen.findByText("Đã lưu bản dịch.")).toBeInTheDocument();
});
