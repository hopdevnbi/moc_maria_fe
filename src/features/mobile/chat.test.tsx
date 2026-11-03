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
  const view = (provider?: string, service?: string) => (
    <QueryClientProvider client={client}>
      <KtvChatPage provider={provider} service={service} />
    </QueryClientProvider>
  );
  const rendered = render(view(provider, service));
  return {
    client,
    ...rendered,
    navigate: (provider?: string, service?: string) => rendered.rerender(view(provider, service)),
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
  it("opens an existing selected provider immediately and keeps the chosen service without another create request", async () => {
    mount("demo-ktv-01", "neck");
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    expect(screen.getByRole("combobox", { name: "Chọn dịch vụ để tư vấn" })).toHaveValue("neck");
    expect(
      state.fetch.mock.calls.some(
        ([path, init]) => path === "/ktv-chat/threads" && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("selects a different KTV when navigating within the same chat page and clears an old inbox filter", async () => {
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation((path: string, init?: RequestInit) =>
      path === "/ktv-chat/providers"
        ? Promise.resolve([
            { id: "p1", publicName: "Ngọc Mai", services: [] },
            { id: "p2", publicName: "Thanh An", services: [] },
          ])
        : original(path, init),
    );
    const { navigate } = mount("p1");
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    expect(input).toHaveAttribute("placeholder", "Nhắn cho Ngọc Mai...");
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm cuộc trò chuyện" }), {
      target: { value: "Mai" },
    });
    navigate("p2");
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nội dung tin nhắn" })).toHaveAttribute(
        "placeholder",
        "Nhắn cho Thanh An...",
      ),
    );
    expect(screen.getByRole("searchbox", { name: "Tìm cuộc trò chuyện" })).toHaveValue("");
  });

  it("keeps the latest provider after an earlier open request finishes out of order", async () => {
    const deferred: Record<string, (value: unknown) => void> = {};
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    state.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads" && init?.method === "POST")
        return new Promise((resolve) => {
          deferred[JSON.parse(init.body as string).providerApplicationId] = resolve;
        });
      if (path === "/ktv-chat/providers")
        return Promise.resolve(
          ids.map((id, i) => ({ id, publicName: i ? "Thanh An" : "Ngọc Mai", services: [] })),
        );
      return Promise.resolve([]);
    });
    const { navigate } = mount(ids[0]);
    await waitFor(() => expect(deferred[ids[0]]).toBeDefined());
    expect(screen.getByRole("button", { name: "Hủy mở hội thoại" })).toBeInTheDocument();
    navigate(ids[1]);
    await waitFor(() => expect(deferred[ids[1]]).toBeDefined());
    await act(async () => deferred[ids[1]]({ ...second, provider_application_id: ids[1] }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    expect(input).toHaveAttribute("placeholder", "Nhắn cho Thanh An...");
    await act(async () => deferred[ids[0]]({ ...first, provider_application_id: ids[0] }));
    expect(input).toHaveAttribute("placeholder", "Nhắn cho Thanh An...");
  });

  it("does not reopen a canceled slow provider request or fetch its messages", async () => {
    let finish!: (value: unknown) => void;
    const id = "11111111-1111-4111-8111-111111111111";
    state.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads" && init?.method === "POST")
        return new Promise((resolve) => {
          finish = resolve;
        });
      return Promise.resolve([]);
    });
    mount(id);
    await waitFor(() => expect(finish).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Hủy mở hội thoại" }));
    await act(async () => finish({ ...first, provider_application_id: id }));
    expect(screen.queryByRole("textbox", { name: "Nội dung tin nhắn" })).not.toBeInTheDocument();
    expect(state.fetch.mock.calls.some(([path]) => path.endsWith("/messages"))).toBe(false);
  });

  it("retries the KTV chosen in the picker instead of reopening an older URL recipient", async () => {
    const posts: string[] = [];
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads" && init?.method !== "POST") return Promise.resolve([first]);
      if (path === "/ktv-chat/providers")
        return Promise.resolve([
          { id: "p1", publicName: "Ngọc Mai", services: [] },
          { id: "p2", publicName: "Thanh An", services: [] },
        ]);
      if (path === "/ktv-chat/threads" && init?.method === "POST") {
        posts.push(JSON.parse(init.body as string).providerApplicationId);
        return posts.length === 1 ? Promise.reject(new Error("offline")) : Promise.resolve(second);
      }
      return original(path, init);
    });
    mount("p1");
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    fireEvent.click(screen.getByRole("button", { name: "Chọn KTV" }));
    fireEvent.click(await screen.findByRole("button", { name: /Thanh An/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Thử kết nối lại" }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    expect(input).toHaveAttribute("placeholder", "Nhắn cho Thanh An...");
    expect(posts).toEqual(["p2", "p2"]);
  });

  it("rejects a mismatched open response rather than displaying another recipient", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation((path: string, init?: RequestInit) =>
      path === "/ktv-chat/threads" && init?.method === "POST"
        ? Promise.resolve(first)
        : original(path, init),
    );
    mount(id);
    await screen.findByText("Chưa mở đúng KTV bạn chọn. Hãy thử chọn lại KTV.");
    expect(screen.queryByRole("textbox", { name: "Nội dung tin nhắn" })).not.toBeInTheDocument();
  });

  it("explains a provider-only account instead of silently ignoring its selected-KTV link", async () => {
    state.user = { id: "provider", permissions: ["provider.portal"] };
    mount("11111111-1111-4111-8111-111111111111");
    await screen.findByText(/chưa có quyền bắt đầu trò chuyện với KTV khác/);
    expect(screen.getByRole("heading", { name: "Tin nhắn khách hàng" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Tìm cuộc trò chuyện" })).toHaveAttribute(
      "placeholder",
      "Tìm cuộc trò chuyện...",
    );
    expect(
      state.fetch.mock.calls.some(
        ([path, init]) => path === "/ktv-chat/threads" && init?.method === "POST",
      ),
    ).toBe(false);
    expect(state.fetch.mock.calls.some(([path]) => path === "/ktv-chat/providers")).toBe(false);
  });

  it("does not send while the Vietnamese keyboard is confirming composition", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    fireEvent.change(input, { target: { value: "Xin chào" } });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    expect(input).toHaveValue("Xin chào");
    expect(
      state.fetch.mock.calls.some(
        ([path, init]) => path.endsWith("/messages") && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("lets readers jump back to latest messages without losing their position to background updates", async () => {
    const { client } = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    const log = screen.getByRole("log", { name: "Tin nhắn" });
    Object.defineProperties(log, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    log.scrollTop = 10;
    fireEvent.scroll(log);
    await act(async () => {
      client.setQueryData(["ktv-chat", "customer", "messages", "a"], {
        pages: [
          [
            {
              id: "later",
              thread_id: "a",
              sender_user_id: "provider",
              body: "Có tin mới",
              created_at: first.updated_at,
            },
          ],
        ],
        pageParams: [undefined],
      });
    });
    expect(log.scrollTop).toBe(10);
    fireEvent.click(screen.getByRole("button", { name: "Về tin mới nhất" }));
    expect(log.scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "Về tin mới nhất" })).not.toBeInTheDocument();
  });

  it("resolves a public presentation alias to the real KTV application before opening", async () => {
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation((path: string, init?: RequestInit) =>
      path === "/ktv-chat/threads" && init?.method !== "POST"
        ? Promise.resolve([])
        : original(path, init),
    );
    mount("demo-ktv-01");
    await waitFor(() =>
      expect(
        state.fetch.mock.calls.some(
          ([path, init]) =>
            path === "/ktv-chat/threads" &&
            init?.method === "POST" &&
            JSON.parse(init.body).providerApplicationId === "p1",
        ),
      ).toBe(true),
    );
    expect(
      state.fetch.mock.calls.some(
        ([path, init]) =>
          path === "/ktv-chat/threads" &&
          init?.method === "POST" &&
          JSON.parse(init.body).providerApplicationId === "demo-ktv-01",
      ),
    ).toBe(false);
    await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
  });
  it("uses current service names for consultation drafts without changing service IDs", async () => {
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation((path: string, init?: RequestInit) =>
      path === "/ktv-chat/providers"
        ? Promise.resolve([
            {
              id: "p1",
              publicName: "Ngọc Mai",
              services: [{ id: "demo-hair", name: "Gội đầu dưỡng sinh" }],
            },
          ])
        : original(path, init),
    );
    mount("p1", "demo-hair");
    const select = await screen.findByRole("combobox", { name: "Chọn dịch vụ để tư vấn" });
    expect(select).toHaveValue("demo-hair");
    expect(screen.getByRole("option", { name: "Gội đầu sạch" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Gội đầu dưỡng sinh" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Soạn câu hỏi" }));
    expect(
      (screen.getByRole("textbox", { name: "Nội dung tin nhắn" }) as HTMLTextAreaElement).value,
    ).toContain("Gội đầu sạch");
  });
  it("merges incremental replies without downloading old history again or showing duplicates", async () => {
    const baseline = {
      id: "old",
      thread_id: "a",
      sender_user_id: "provider",
      body: "Tin cũ",
      created_at: first.updated_at,
    };
    let deliver!: (messages: (typeof baseline)[]) => void;
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads/a/messages") return Promise.resolve([baseline]);
      if (path.includes("/a/updates"))
        return new Promise((resolve) => {
          deliver = resolve;
        });
      return original(path, init);
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    await screen.findByText("Tin cũ");
    await waitFor(() =>
      expect(
        state.fetch.mock.calls.some(([path]) => path === "/ktv-chat/threads/a/updates?after=old"),
      ).toBe(true),
    );
    await act(async () =>
      deliver([
        baseline,
        { ...baseline, id: "new", body: "Tin mới", created_at: "2026-10-09T08:01:00Z" },
      ]),
    );
    await screen.findByText("Tin mới");
    expect(screen.getAllByText("Tin cũ")).toHaveLength(1);
    expect(
      state.fetch.mock.calls.filter(([path]) => path === "/ktv-chat/threads/a/messages"),
    ).toHaveLength(1);
  });
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
    await screen.findByRole("button", { name: "Gửi lại" });
    expect(screen.getByText("Kiểm tra kết nối rồi chạm Gửi lại.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử kết nối lại" })).not.toBeInTheDocument();
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
      "/chuyen-vien/nguyet-nguyen",
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
  it.each(["customer", "provider"])(
    "shows image and queued text immediately for %s while upload and save are delayed",
    async (role) => {
      if (role === "provider") state.user = { id: "provider", permissions: ["provider.portal"] };
      let upload!: (value: { url: string }) => void;
      let save!: (value: unknown) => void;
      const url = "https://media.example/chat/photo.webp";
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => "blob:pending-photo"),
      });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
      const posts: { body: string; imageUrl?: string; clientMessageId: string }[] = [];
      const original = state.fetch.getMockImplementation()!;
      state.fetch.mockImplementation((path: string, init?: RequestInit) => {
        if (path === "/ktv-chat/threads" && init?.method !== "POST")
          return Promise.resolve([
            { ...first, provider_user_id: "provider", customer_name: "Khách A" },
          ]);
        if (path.endsWith("/images"))
          return new Promise((resolve) => {
            upload = resolve;
          });
        if (path.endsWith("/messages") && init?.method === "POST") {
          const input = JSON.parse(init.body as string);
          posts.push(input);
          if (posts.length === 1)
            return new Promise((resolve) => {
              save = resolve;
            });
          return Promise.resolve({
            id: input.clientMessageId,
            thread_id: "a",
            sender_user_id: role,
            body: input.body,
            created_at: new Date().toISOString(),
          });
        }
        return original(path, init);
      });
      mount();
      fireEvent.click(
        await screen.findByRole("button", { name: role === "customer" ? /Ngọc Mai/ : /Khách A/ }),
      );
      const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
      await waitFor(() => expect(screen.queryByText("Đang tải tin nhắn…")).not.toBeInTheDocument());
      fireEvent.change(screen.getByLabelText("Tệp ảnh đính kèm"), {
        target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] },
      });
      fireEvent.change(input, { target: { value: "Ảnh tư vấn" } });
      fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
      const log = within(screen.getByRole("log", { name: "Tin nhắn" }));
      expect(await log.findByAltText("Ảnh đính kèm trong tin nhắn")).toHaveAttribute(
        "src",
        "blob:pending-photo",
      );
      expect(log.getByText("Ảnh tư vấn")).toBeInTheDocument();
      expect(log.getByText("Đang gửi…")).toBeInTheDocument();
      expect(input).toHaveValue("");
      expect(screen.queryByAltText("Ảnh chuẩn bị gửi")).not.toBeInTheDocument();
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:pending-photo");
      expect(posts).toHaveLength(0);
      fireEvent.change(input, { target: { value: "Tin tiếp theo" } });
      expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeEnabled();
      fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
      await log.findByText("Tin tiếp theo");
      expect(log.getAllByText("Đang gửi…")).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Chọn ảnh đính kèm" })).toBeEnabled();
      await act(async () => upload({ url }));
      await waitFor(() => expect(posts).toHaveLength(1));
      expect(posts[0].imageUrl).toBe(url);
      fireEvent.change(input, { target: { value: "Bản nháp mới" } });
      await act(async () =>
        save({
          id: "photo-saved",
          thread_id: "a",
          sender_user_id: role,
          body: posts[0].body,
          image_url: url,
          created_at: first.updated_at,
        }),
      );
      await waitFor(() => expect(posts).toHaveLength(2));
      expect(posts[1].body).toBe("Tin tiếp theo");
      expect(posts[1].clientMessageId).not.toBe(posts[0].clientMessageId);
      expect(input).toHaveValue("Bản nháp mới");
      expect(log.getAllByText("Ảnh tư vấn")).toHaveLength(1);
      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pending-photo"));
    },
  );
  it("cancels an image save when a private thread is locked during upload", async () => {
    let upload!: (value: { url: string }) => void;
    const original = state.fetch.getMockImplementation()!;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:private"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    state.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path.endsWith("/images"))
        return new Promise((resolve) => {
          upload = resolve;
        });
      return original(path, init);
    });
    const { client } = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const input = await screen.findByRole("textbox", { name: "Nội dung tin nhắn" });
    await waitFor(() => expect(screen.queryByText("Đang tải tin nhắn…")).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Tệp ảnh đính kèm"), {
      target: { files: [new File(["photo"], "private.png", { type: "image/png" })] },
    });
    fireEvent.change(input, { target: { value: "Ảnh riêng" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await screen.findByText("Đang gửi…");
    await waitFor(() => expect(upload).toBeDefined());
    await act(async () => {
      client.setQueryData(
        ["ktv-chat", "customer", "threads"],
        [{ ...first, privacy_enabled: true, history_locked: true }, second],
      );
    });
    await waitFor(() => expect(screen.queryByText("Ảnh riêng")).not.toBeInTheDocument());
    await act(async () => upload({ url: "https://media.example/chat/private.webp" }));
    expect(
      state.fetch.mock.calls.some(
        ([path, init]) => path.endsWith("/messages") && init?.method === "POST",
      ),
    ).toBe(false);
    expect(screen.queryByAltText("Ảnh đính kèm trong tin nhắn")).not.toBeInTheDocument();
  });
  it.each(["upload", "save"])(
    "retries a failed image %s without losing its preview or duplicating the upload",
    async (failure) => {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => "blob:retry-photo"),
      });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
      let uploads = 0;
      const posts: { clientMessageId: string; imageUrl: string }[] = [];
      const url = "https://media.example/chat/retry.webp";
      const original = state.fetch.getMockImplementation()!;
      state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
        if (path.endsWith("/images")) {
          uploads++;
          if (failure === "upload" && uploads === 1) throw new Error("network");
          return { url };
        }
        if (path.endsWith("/messages") && init?.method === "POST") {
          posts.push(JSON.parse(init.body as string));
          if (failure === "save" && posts.length === 1) throw new Error("network");
          return {
            id: "saved-photo",
            thread_id: "a",
            sender_user_id: "customer",
            body: "",
            image_url: url,
            created_at: first.updated_at,
          };
        }
        return original(path, init);
      });
      const { unmount } = mount();
      fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
      const picker = await screen.findByLabelText("Tệp ảnh đính kèm");
      await waitFor(() => expect(screen.queryByText("Đang tải tin nhắn…")).not.toBeInTheDocument());
      fireEvent.change(picker, {
        target: { files: [new File(["photo"], "photo.webp", { type: "image/webp" })] },
      });
      fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
      const retry = await screen.findByRole("button", { name: "Gửi lại" });
      expect(screen.getByAltText("Ảnh đính kèm trong tin nhắn")).toHaveAttribute(
        "src",
        "blob:retry-photo",
      );
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:retry-photo");
      const input = screen.getByRole("textbox", { name: "Nội dung tin nhắn" });
      fireEvent.change(input, { target: { value: "Giữ bản nháp này" } });
      fireEvent.click(retry);
      await screen.findByText("Đã gửi");
      expect(uploads).toBe(failure === "upload" ? 2 : 1);
      if (failure === "save") expect(posts[0].clientMessageId).toBe(posts[1].clientMessageId);
      expect(input).toHaveValue("Giữ bản nháp này");
      expect(screen.getAllByAltText("Ảnh đính kèm trong tin nhắn")).toHaveLength(1);
      unmount();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:retry-photo");
    },
  );
  it("uploads an image and sends an image-only message containing its CDN URL", async () => {
    const url = "https://giangxa-media.b-cdn.net/moc-maria/chat-attachments/a/photo.webp";
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:chat-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/ktv-chat/threads/a/images") return { url };
      if (path === "/ktv-chat/threads/a/messages" && init?.method === "POST")
        return {
          id: "photo",
          thread_id: "a",
          sender_user_id: "customer",
          body: "",
          image_url: url,
          created_at: first.updated_at,
        };
      return original(path, init);
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Ngọc Mai/ }));
    const picker = await screen.findByLabelText("Tệp ảnh đính kèm");
    const file = new File(["png"], "photo.png", { type: "image/png" });
    fireEvent.change(picker, { target: { files: [file] } });
    expect(screen.getByAltText("Ảnh chuẩn bị gửi")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() =>
      expect(
        state.fetch.mock.calls.some(
          ([path, init]) =>
            path === "/ktv-chat/threads/a/messages" &&
            init?.method === "POST" &&
            JSON.parse(init.body as string).imageUrl === url,
        ),
      ).toBe(true),
    );
    const upload = state.fetch.mock.calls.find(([path]) => path === "/ktv-chat/threads/a/images");
    expect(upload?.[1]?.body).toBeInstanceOf(FormData);
    expect((upload?.[1]?.body as FormData).get("file")).toBe(file);
    expect(upload?.[1]?.headers).not.toHaveProperty("Content-Type");
    fireEvent.click(await screen.findByRole("button", { name: "Xem ảnh đính kèm lớn" }));
    expect(screen.getByRole("dialog", { name: "Ảnh đính kèm phóng to" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đóng ảnh lớn" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("lets KTV remove an image preview and rejects non-images or over-5MB photos", async () => {
    state.user = { id: "provider", permissions: ["provider.portal"] };
    const original = state.fetch.getMockImplementation()!;
    state.fetch.mockImplementation(async (path: string, init?: RequestInit) =>
      path === "/ktv-chat/threads"
        ? [{ ...first, provider_user_id: "provider", customer_name: "Khách A" }]
        : original(path, init),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:chat-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Khách A/ }));
    const picker = await screen.findByLabelText("Tệp ảnh đính kèm");
    fireEvent.change(picker, {
      target: { files: [new File(["x"], "note.pdf", { type: "application/pdf" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
    fireEvent.change(picker, {
      target: {
        files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" })],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Dung lượng ảnh tối đa là 5 MB.");
    fireEvent.change(picker, {
      target: { files: [new File(["webp"], "portrait.webp", { type: "image/webp" })] },
    });
    expect(screen.getByAltText("Ảnh chuẩn bị gửi")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa ảnh đính kèm" }));
    expect(screen.queryByAltText("Ảnh chuẩn bị gửi")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeDisabled();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:chat-preview"));
    expect(state.fetch.mock.calls.some(([path]) => path === "/ktv-chat/threads/a/images")).toBe(
      false,
    );
  });
});
