import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderReviewsAdmin } from "./reviews-admin";

const mock = vi.hoisted(() => ({
  path: "",
  mutateAsync: vi.fn().mockResolvedValue({ id: "review-1" }),
  refetch: vi.fn().mockResolvedValue({}),
  reset: vi.fn(),
}));
vi.mock("./private-api", () => ({
  usePrivateData: (path: string) => {
    mock.path = path;
    return {
      data: {
        items: [
          {
            id: "review-1",
            provider_application_id: "ktv-1",
            provider_name: "Linh Anh",
            service_name: "Massage thư giãn",
            stars: 5,
            comment: "Dịch vụ tận tâm, chu đáo",
            visibility: "HIDDEN",
            moderation_status: "PENDING",
            version: 2,
            created_at: "2026-10-10T09:00:00Z",
            updated_at: "2026-10-10T09:00:00Z",
          },
        ],
        page: 1,
        total: 1,
        pending: 1,
        hasMore: false,
      },
      isPending: false,
      isError: false,
      refetch: mock.refetch,
    };
  },
  usePrivateMutation: () => ({
    mutateAsync: mock.mutateAsync,
    reset: mock.reset,
    isPending: false,
    isError: false,
  }),
  mutationMessage: () => "Có lỗi.",
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Admin KTV review moderation", () => {
  it("shows the pending queue, stars, review and provider without customer PII", () => {
    render(<ProviderReviewsAdmin />);
    expect(mock.path).toBe("/admin/provider-reviews?status=PENDING&page=1");
    expect(screen.getByText("Linh Anh")).toBeInTheDocument();
    expect(screen.getByText("Dịch vụ tận tâm, chu đáo")).toBeInTheDocument();
    expect(screen.getByLabelText("5 trên 5 sao")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Duyệt đăng/ })).toBeEnabled();
    expect(screen.queryByText("customer@example.test")).not.toBeInTheDocument();
  });

  it("requires a moderation reason and sends the current review version", async () => {
    render(<ProviderReviewsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /Duyệt đăng/ }));
    const dialog = screen.getByRole("dialog", { name: "Duyệt đánh giá" });
    const confirm = screen.getByRole("button", { name: "Xác nhận" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: /Lý do xử lý/ }), {
      target: { value: "Đã xác minh lịch dịch vụ và nội dung." },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(mock.mutateAsync).toHaveBeenCalledWith({
        path: "/admin/provider-reviews/review-1/visibility",
        method: "PATCH",
        body: {
          visibility: "PUBLISHED",
          expectedVersion: 2,
          reason: "Đã xác minh lịch dịch vụ và nội dung.",
        },
      }),
    );
    expect(dialog).not.toBeInTheDocument();
  });

  it("lets the admin reject pending feedback without publishing it", async () => {
    render(<ProviderReviewsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Lý do xử lý/ }), {
      target: { value: "Nội dung chứa thông tin riêng tư." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(mock.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ visibility: "HIDDEN", expectedVersion: 2 }),
        }),
      ),
    );
  });
});
