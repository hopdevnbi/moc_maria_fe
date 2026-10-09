import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderRating, ProviderReviews } from "./reviews";
const state = vi.hoisted(() => ({ fetch: vi.fn(), status: "authenticated" }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: state.status,
    user:
      state.status === "anonymous" ? null : { id: "customer", permissions: ["customer.portal"] },
    authFetch: state.fetch,
  }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
const eligible = {
  appointment_id: "booking",
  provider_application_id: "p1",
  provider_name: "Mai",
  service_name: "Chăm sóc cơ thể",
  completed_at: "2026-10-09T10:00:00Z",
  review_id: null,
  stars: null,
  comment: null,
  visibility: null,
  version: null,
  editable_until: null,
};
function mount(component: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
}
beforeEach(() => {
  state.status = "authenticated";
  state.fetch.mockReset().mockResolvedValue([eligible]);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("/ratings")
          ? { p1: { average: null, count: 0 } }
          : { summary: { average: null, count: 0 }, items: [], hasMore: false },
    })),
  );
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("verified service feedback", () => {
  it("shows no invented score for a new KTV and omits demo ratings", async () => {
    mount(
      <>
        <ProviderRating providerId="p1" />
        <ProviderRating providerId="demo" isDemo />
      </>,
    );
    await screen.findByText("Chưa có đánh giá");
    expect(screen.queryByText(/0\/5/)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("requires a star and nonblank comment, then sends only the selected completed service", async () => {
    mount(<ProviderReviews providerId="p1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Viết đánh giá" }));
    const send = screen.getByRole("button", { name: "Gửi đánh giá" });
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /4 sao/ }));
    const input = screen.getByRole("textbox", { name: "Nhận xét của bạn" });
    fireEvent.change(input, { target: { value: "   " } });
    expect(send).toBeDisabled();
    fireEvent.change(input, { target: { value: "  Chăm sóc chu đáo  " } });
    fireEvent.click(send);
    await waitFor(() =>
      expect(state.fetch).toHaveBeenCalledWith(
        "/provider-reviews",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            stars: 4,
            comment: "Chăm sóc chu đáo",
            appointmentId: "booking",
            providerApplicationId: "p1",
          }),
        }),
      ),
    );
  });
  it("offers no write button to anonymous customers", async () => {
    state.status = "anonymous";
    mount(<ProviderReviews providerId="p1" />);
    await screen.findByRole("link", { name: "Đăng nhập" });
    expect(state.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Viết đánh giá" })).not.toBeInTheDocument();
  });
});
