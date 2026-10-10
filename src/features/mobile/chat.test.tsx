import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvChatPage } from "./chat";
import { ApiError } from "@/features/auth/auth-api";

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
  state.user = { id: "customer", permissions: ["customer.portal"] };
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
  it("keeps customer password controls off a provider's chat even with dual-role permissions", async () => {
    state.user = { id: "provider", permissions: ["customer.portal", "provider.portal"] };
    state.fetch.mockImplementation(async (path: string) => {
      if (path === "/ktv-chat/threads")
        return [{ ...first, provider_user_id: "provider", customer_name: "Khách hội thoại" }];
      if (path.endsWith("/read")) return undefined;
      return [];
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Khách hội thoại/ }));
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    expect(screen.queryByRole("button", { name: "Đặt mật khẩu chat" })).not.toBeInTheDocument();
  });
  it("does not fetch/render cached history or a stale preview for a password-protected chat", async () => {
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) =>
      path === "/ktv-chat/threads"
        ? [
            {
              ...first,
              privacy_enabled: true,
              history_locked: true,
              last_message: "PRIVATE PREVIEW",
            },
            second,
          ]
        : original(path, init),
    );
    const { client } = mount();
    client.setQueryData(["ktv-chat", "customer", "messages", "a"], {
      pages: [
        [
          {
            id: "secret",
            thread_id: "a",
            sender_user_id: "provider",
            body: "PRIVATE HISTORY",
            created_at: first.updated_at,
          },
        ],
      ],
      pageParams: [undefined],
    });
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    expect(screen.getByRole("heading", { name: "Hội thoại đã khóa" })).toBeInTheDocument();
    expect(screen.queryByText("PRIVATE HISTORY")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIVATE PREVIEW")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nội dung tin nhắn" })).not.toBeInTheDocument();
    expect(
      state.fetch.mock.calls.some(
        ([path]) => path.includes("/a/messages") || path.endsWith("/read"),
      ),
    ).toBe(false);
  });
  it("keeps unlock proof only in memory, passes it to history/read, and locks when leaving", async () => {
    const protectedThread = { ...first, privacy_enabled: true, history_locked: true };
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads") return [protectedThread, second];
      if (path.endsWith("/privacy/unlock"))
        return {
          ...protectedThread,
          history_locked: false,
          unlock_token: "memory-only-proof",
          unlock_expires_at: new Date(Date.now() + 900000).toISOString(),
        };
      if (path.endsWith("/privacy/lock")) return protectedThread;
      if (path === "/ktv-chat/threads/a/messages")
        return [
          {
            id: "private",
            thread_id: "a",
            sender_user_id: "provider",
            body: "UNLOCKED HISTORY",
            created_at: first.updated_at,
          },
        ];
      return original(path, init);
    });
    const { client } = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    fireEvent.change(screen.getByLabelText("Mật khẩu chat", { exact: true }), {
      target: { value: "private passphrase" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mở khóa hội thoại" }));
    await screen.findByText("UNLOCKED HISTORY");
    await waitFor(() =>
      expect(
        state.fetch.mock.calls.some(
          ([path, init]) =>
            path.endsWith("/read") &&
            new Headers(init.headers).get("X-Chat-Unlock") === "memory-only-proof",
        ),
      ).toBe(true),
    );
    expect(
      state.fetch.mock.calls.find(([path]) => path === "/ktv-chat/threads/a/messages")?.[1].headers[
        "X-Chat-Unlock"
      ],
    ).toBe("memory-only-proof");
    expect(JSON.stringify(client.getQueryData(["ktv-chat", "customer", "threads"]))).not.toContain(
      "memory-only-proof",
    );
    expect(JSON.stringify(localStorage)).not.toContain("memory-only-proof");
    fireEvent.click(screen.getByRole("button", { name: /Thanh An/ }));
    await waitFor(() =>
      expect(state.fetch.mock.calls.some(([path]) => path.endsWith("/a/privacy/lock"))).toBe(true),
    );
    expect(client.getQueryData(["ktv-chat", "customer", "messages", "a"])).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: /Ngọc Mai/ }));
    expect(screen.getByRole("heading", { name: "Hội thoại đã khóa" })).toBeInTheDocument();
    expect(screen.queryByText("UNLOCKED HISTORY")).not.toBeInTheDocument();
  });
  it("removes visible/cached history when the server revokes an unlock", async () => {
    let revoked = false;
    const protectedThread = { ...first, privacy_enabled: true, history_locked: true };
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads") return [protectedThread];
      if (path.endsWith("/privacy/unlock"))
        return {
          ...protectedThread,
          history_locked: false,
          unlock_token: "proof",
          unlock_expires_at: new Date(Date.now() + 900000).toISOString(),
        };
      if (path.endsWith("/a/messages")) {
        if (revoked) throw new ApiError(403, "Hội thoại đã khóa.", { error: "CHAT_LOCKED" });
        return [
          {
            id: "private",
            thread_id: "a",
            sender_user_id: "provider",
            body: "REVOKED HISTORY",
            created_at: first.updated_at,
          },
        ];
      }
      return original(path, init);
    });
    const { client } = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    fireEvent.change(screen.getByLabelText("Mật khẩu chat", { exact: true }), {
      target: { value: "passphrase" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mở khóa hội thoại" }));
    await screen.findByText("REVOKED HISTORY");
    revoked = true;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["ktv-chat", "customer", "messages", "a"] });
    });
    await screen.findByRole("heading", { name: "Hội thoại đã khóa" });
    expect(screen.queryByText("REVOKED HISTORY")).not.toBeInTheDocument();
    expect(client.getQueryData(["ktv-chat", "customer", "messages", "a"])).toBeUndefined();
  });

  it("shows an outgoing bubble before the network resolves, keeps the next draft and reconciles once", async () => {
    let finish!: (value: unknown) => void;
    const message = {
      id: "confirmed",
      thread_id: "a",
      sender_user_id: "customer",
      body: "Xin tư vấn",
      created_at: first.updated_at,
    };
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/messages") && init?.method === "POST")
        return new Promise((resolve) => {
          finish = resolve;
        });
      return original(path, init);
    });
    const { client } = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    fireEvent.change(input, { target: { value: message.body } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeEnabled());
    fireEvent.submit(input.closest("form")!);
    const log = within(screen.getByRole("log", { name: "Tin nhắn" }));
    await log.findByText(message.body);
    expect(log.getByText("Đang gửi…")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: "Câu tiếp theo" } });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["ktv-chat", "customer", "messages", "a"] });
    });
    expect(log.getAllByText(message.body)).toHaveLength(1);
    await act(async () => finish(message));
    await log.findByText("Đã gửi");
    expect(input).toHaveValue("Câu tiếp theo");
    await act(async () => {
      client.setQueryData(["ktv-chat", "customer", "messages", "a"], {
        pages: [[message]],
        pageParams: [undefined],
      });
    });
    expect(log.getAllByText(message.body)).toHaveLength(1);
  });
  it("keeps a failed bubble and the next draft, retries it with the original key across thread switches", async () => {
    let fail!: (error: Error) => void;
    const sent: { body: string; clientMessageId: string }[] = [];
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/messages") && init?.method === "POST") {
        sent.push(JSON.parse(init.body as string));
        if (sent.length === 1)
          return new Promise((_resolve, reject) => {
            fail = reject;
          });
        return {
          id: "retry-confirmed",
          thread_id: "a",
          sender_user_id: "customer",
          body: sent[0].body,
          created_at: first.updated_at,
        };
      }
      return original(path, init);
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    fireEvent.change(input, { target: { value: "Tin đầu" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await screen.findByText("Đang gửi…");
    fireEvent.change(input, { target: { value: "Tin tiếp theo" } });
    fireEvent.click(screen.getByRole("button", { name: /Thanh An/ }));
    expect(screen.queryByText("Tin đầu")).not.toBeInTheDocument();
    await act(async () => fail(new Error("network")));
    fireEvent.click(screen.getByRole("button", { name: /Ngọc Mai/ }));
    expect(input).toHaveValue("Tin tiếp theo");
    fireEvent.click(await screen.findByRole("button", { name: "Gửi lại" }));
    await screen.findByText("Đã gửi");
    expect(sent[0].clientMessageId).toBe(sent[1].clientMessageId);
    expect(input).toHaveValue("Tin tiếp theo");
  });
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
