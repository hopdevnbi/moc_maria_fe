import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvChatPage } from "./chat";

const state = vi.hoisted(() => ({
  fetch: vi.fn(),
  status: "authenticated",
  user: { id: "customer", permissions: ["customer.portal"] },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: state.status,
    user: state.status === "anonymous" ? null : state.user,
    authFetch: state.fetch,
  }),
}));
vi.mock("./experience", () => ({
  MobileHeader: () => <header>Header</header>,
  MobileNavigation: () => <nav>Navigation</nav>,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const first = {
  id: "a",
  customer_user_id: "customer",
  provider_application_id: "p1",
  provider_name: "Ngọc Mai",
  updated_at: "2026-10-09T08:00:00Z",
};
const second = { ...first, id: "b", provider_application_id: "p2", provider_name: "Thanh An" };
function mount(provider?: string, service?: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false },
      mutations: { retry: false },
    },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <KtvChatPage provider={provider} service={service} />
      </QueryClientProvider>,
    ),
  };
}
beforeEach(() => {
  state.status = "authenticated";
  state.fetch.mockReset().mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/ktv-chat/threads") return init?.method === "POST" ? first : [first, second];
    if (path === "/ktv-chat/providers")
      return [
        {
          id: "p1",
          publicName: "Ngọc Mai",
          publicAlias: "demo-ktv-01",
          services: [{ id: "neck", name: "Massage cổ vai gáy" }],
        },
        { id: "demo", publicName: "Demo KTV", isDemo: true },
      ];
    if (path.endsWith("/read")) return undefined;
    if (path.endsWith("/messages")) return [];
    return [];
  });
});
afterEach(() => cleanup());
describe("private KTV chat interactions", () => {
  it("requires login while preserving the chosen KTV", () => {
    state.status = "anonymous";
    mount("p1");
    expect(screen.getByRole("link", { name: /Đăng nhập để nhắn tin/ })).toHaveAttribute(
      "href",
      expect.stringContaining("provider%3Dp1"),
    );
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("lets customers pick a real KTV directly from chat and excludes demos", async () => {
    mount();
    await screen.findByRole("button", { name: /Ngọc Mai/ });
    fireEvent.click(screen.getByRole("button", { name: "Chọn KTV" }));
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    expect(screen.queryByText("Demo KTV")).not.toBeInTheDocument();
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
  });
  it("keeps a separate draft when switching technicians", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    fireEvent.change(input, { target: { value: "Draft Mai" } });
    fireEvent.click(screen.getByRole("button", { name: /Thanh An/ }));
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "Draft An" } });
    fireEvent.click(screen.getByRole("button", { name: /Ngọc Mai/ }));
    expect(input).toHaveValue("Draft Mai");
  });
  it("late messages from a previous KTV cannot appear in the new conversation", async () => {
    let finish!: (value: unknown) => void;
    state.fetch.mockImplementation(async (path: string) => {
      if (path === "/ktv-chat/threads") return [first, second];
      if (path === "/ktv-chat/providers") return [];
      if (path === "/ktv-chat/threads/a/messages")
        return new Promise((resolve) => {
          finish = resolve;
        });
      if (path === "/ktv-chat/threads/b/messages")
        return [
          {
            id: "new",
            thread_id: "b",
            sender_user_id: "provider",
            body: "An response",
            created_at: "2026-10-09T08:01:00Z",
          },
        ];
      return undefined;
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    await waitFor(() => expect(finish).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Thanh An/ }));
    await screen.findByText("An response");
    finish([{ id: "late", body: "Mai private response" }]);
    await waitFor(() => expect(screen.queryByText("Mai private response")).not.toBeInTheDocument());
  });
  it("failed sends preserve text and retry with the same idempotency key", async () => {
    const sent: Array<{ body: string; clientMessageId: string }> = [];
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/messages") && init?.method === "POST") {
        sent.push(JSON.parse(init.body as string));
        if (sent.length === 1) throw new Error("network");
        return { id: "sent" };
      }
      return original(path, init);
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeDisabled(),
    );
    fireEvent.change(input, { target: { value: "Hello Mai" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await screen.findAllByText(/Chưa kết nối được chat/);
    expect(input).toHaveValue("Hello Mai");
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(input).toHaveValue(""));
    expect(sent[0].clientMessageId).toBe(sent[1].clientMessageId);
  });
  it("mobile back returns to the conversation list", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    fireEvent.click(screen.getByRole("button", { name: "Quay lại danh sách hội thoại" }));
    expect(screen.queryByRole("textbox", { name: "Nội dung tin nhắn" })).not.toBeInTheDocument();
  });
  it("a peer block disables sending while keeping history visible", async () => {
    state.fetch.mockImplementation(async (path: string) => {
      if (path === "/ktv-chat/threads")
        return [{ ...first, blocked_by_other: true, can_send: false }];
      if (path.endsWith("/messages"))
        return [
          {
            id: "old",
            thread_id: "a",
            sender_user_id: "provider",
            body: "Lịch sử vẫn còn",
            created_at: first.updated_at,
          },
        ];
      return [];
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    await screen.findByText("Lịch sử vẫn còn");
    expect(screen.getByRole("textbox", { name: "Nội dung tin nhắn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeDisabled();
    expect(screen.getByText(/Người kia đang chặn hội thoại/)).toBeInTheDocument();
  });
  it("keeps a chosen service through registration and composes its consultation question", async () => {
    mount("p1", "neck");
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    expect(await screen.findByRole("combobox", { name: "Chọn dịch vụ để tư vấn" })).toHaveValue(
      "neck",
    );
    fireEvent.click(screen.getByRole("button", { name: "Soạn câu hỏi" }));
    expect(
      (screen.getByRole("textbox", { name: "Nội dung tin nhắn" }) as HTMLTextAreaElement).value,
    ).toContain("Massage cổ vai gáy");
    expect(screen.getByRole("link", { name: /Xem hồ sơ/ })).toHaveAttribute(
      "href",
      "/chuyen-vien/demo-ktv-01",
    );
  });
  it("inserts emoji at the cursor without sending until the customer submits", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = (await screen.findByRole("textbox", {
      name: "Nội dung tin nhắn",
    })) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Xin chào " } });
    input.setSelectionRange(9, 9);
    fireEvent.click(screen.getByRole("button", { name: "Chọn biểu cảm" }));
    fireEvent.click(screen.getByRole("button", { name: "Chèn biểu cảm 😊" }));
    expect(input).toHaveValue("Xin chào 😊");
    expect(
      state.fetch.mock.calls.filter(
        ([path, init]) => path.endsWith("/messages") && init?.method === "POST",
      ),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() =>
      expect(
        state.fetch.mock.calls.some(
          ([path, init]) =>
            path.endsWith("/messages") &&
            init?.method === "POST" &&
            JSON.parse(init.body).body === "Xin chào 😊",
        ),
      ).toBe(true),
    );
  });
});
