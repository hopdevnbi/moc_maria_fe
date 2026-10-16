import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogAdmin } from "./catalog-admin";

const fixture = vi.hoisted(() => ({
  categories: [
    {
      id: "cat-massage",
      name: "Massage trị liệu",
      slug: "massage-tri-lieu",
      isPublished: true,
      sortOrder: 1,
      description: "Các liệu trình massage.",
    },
    {
      id: "cat-drink",
      name: "Đồ uống",
      slug: "do-uong",
      isPublished: false,
      sortOrder: 2,
      description: null,
    },
  ],
  services: [
    {
      id: "service-massage",
      categoryId: "cat-massage",
      name: "Chăm sóc cổ vai gáy",
      slug: "cham-soc-co-vai-gay",
      isPublished: true,
      description: "Gói chăm sóc chuyên sâu.",
    },
    {
      id: "service-drink",
      categoryId: "cat-drink",
      name: "Trà dưỡng nhan",
      slug: "tra-duong-nhan",
      isPublished: true,
      description: "Đồ uống thảo mộc.",
    },
  ],
  save: vi.fn().mockResolvedValue({}),
  refetch: vi.fn(),
}));

vi.mock("./private-api", () => ({
  usePrivateData: (path: string) => ({
    data:
      path === "/admin/services"
        ? fixture.services
        : path === "/admin/service-categories"
          ? fixture.categories
          : [],
    isPending: false,
    isError: false,
    refetch: fixture.refetch,
  }),
  usePrivateMutation: () => ({
    mutateAsync: fixture.save,
    isPending: false,
  }),
  mutationMessage: () => "Không thể lưu",
}));

vi.mock("./booking-settings", () => ({
  BookingSettingsAdmin: () => <p>Thiết lập lịch hẹn</p>,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

afterEach(() => {
  cleanup();
  fixture.save.mockClear();
});

describe("Catalog admin studio", () => {
  it("searches services and keeps hidden categories from appearing live", () => {
    render(<CatalogAdmin />);
    expect(screen.getByText("Chăm sóc cổ vai gáy")).toBeInTheDocument();
    expect(screen.getByText("Trà dưỡng nhan")).toBeInTheDocument();
    expect(screen.getByText("Danh mục ẩn")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Tìm dịch vụ, mô tả, danh mục/), {
      target: { value: "trà" },
    });
    expect(screen.getByText("Trà dưỡng nhan")).toBeInTheDocument();
    expect(screen.queryByText("Chăm sóc cổ vai gáy")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Xóa bộ lọc/ }));
    expect(screen.getByText("Chăm sóc cổ vai gáy")).toBeInTheDocument();
  });

  it("opens only the selected category form and keeps catalog editing separate", () => {
    render(<CatalogAdmin />);
    fireEvent.click(screen.getByRole("tab", { name: /Danh mục/ }));
    expect(screen.queryByLabelText(/Đường dẫn/)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Chỉnh sửa" })[0]);
    expect(screen.getByLabelText(/Đường dẫn/)).toHaveValue("massage-tri-lieu");
    expect(screen.getAllByRole("textbox", { name: "Tên danh mục" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("tab", { name: /Dịch vụ/ }));
    expect(screen.queryByLabelText(/Đường dẫn/)).not.toBeInTheDocument();
  });
});
