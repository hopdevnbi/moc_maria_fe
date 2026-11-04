import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InquiryChatEntry } from "./inquiry-chat-entry";

const state = vi.hoisted(() => ({
  status: "authenticated",
  user: { id: "ktv-1" },
  fetch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: state.status,
    user: state.status === "anonymous" ? null : state.user,
    authFetch: state.fetch,
  }),
}));
vi.mock("./chat", () => ({
  KtvChatPage: ({ threadId }: { threadId: string }) => <div data-testid="thread">{threadId}</div>,
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
const id = "ab".repeat(32);
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <InquiryChatEntry inquiryId={id} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  state.status = "authenticated";
  state.user = { id: "ktv-1" };
  state.fetch.mockReset().mockResolvedValue({ id: "own-thread" });
});
afterEach(cleanup);
it("preserves the exact inquiry through guest login and makes no anonymous POST", () => {
  state.status = "anonymous";
  mount();
  expect(state.fetch).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "Đăng nhập để nhắn tin" })).toHaveAttribute(
    "href",
    "/dang-nhap?returnTo=" + encodeURIComponent("/tin-nhan?inquiry=" + id),
  );
});
it("opens only the authenticated inquiry endpoint and passes its thread to the existing chat", async () => {
  mount();
  expect(await screen.findByTestId("thread")).toHaveTextContent("own-thread");
  expect(state.fetch).toHaveBeenCalledWith(`/ktv-chat/inquiries/${id}/thread`, {
    method: "POST",
    cache: "no-store",
  });
  expect(state.fetch).toHaveBeenCalledTimes(1);
});
it("does not open a chat after a rejected binding and retries the same inquiry", async () => {
  state.fetch.mockRejectedValueOnce(new Error("not own inquiry"));
  mount();
  const retry = await screen.findByRole("button", { name: "Thử lại" });
  expect(screen.queryByTestId("thread")).not.toBeInTheDocument();
  fireEvent.click(retry);
  expect(await screen.findByTestId("thread")).toHaveTextContent("own-thread");
  expect(
    state.fetch.mock.calls.every(([path]) => path === `/ktv-chat/inquiries/${id}/thread`),
  ).toBe(true);
});
it("waits for authentication before opening a conversation", async () => {
  state.status = "loading";
  mount();
  await waitFor(() => expect(screen.getByText(/Đang kiểm tra yêu cầu/)).toBeInTheDocument());
  expect(state.fetch).not.toHaveBeenCalled();
});
