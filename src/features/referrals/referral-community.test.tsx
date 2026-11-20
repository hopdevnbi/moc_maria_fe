import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CommunitySettings, ReferralCommunity, safeCommunityUrl } from "./referral-community";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { LOCALES } from "@/shared/i18n/locale";
import { translate } from "@/shared/i18n/messages";
const mock = vi.hoisted(() => ({
  fetch: vi.fn(),
  user: {
    id: "community-qa",
    isActive: true,
    roles: ["SUPER_ADMIN"],
    permissions: ["admin.portal"],
  },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mock.user, authFetch: mock.fetch }),
}));
const url = "https://zalo.me/g/IsolatedQA";
function mount(node: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <LocaleProvider enabled>{node}</LocaleProvider>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  mock.fetch.mockReset();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
});
it.each(LOCALES)("shows a voluntary, safe Zalo invitation in %s", async (locale) => {
  document.cookie = "moc_locale=" + locale + "; Path=/";
  mock.fetch.mockResolvedValue({ url });
  const dismiss = vi.fn();
  mount(<ReferralCommunity onDismiss={dismiss} />);
  expect(
    await screen.findByRole("link", { name: translate(locale, "ref.joinZalo") }),
  ).toHaveAttribute("href", url);
  expect(screen.getByRole("link", { name: translate(locale, "ref.joinZalo") })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  expect(screen.getByText(translate(locale, "ref.communityHint"))).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: translate(locale, "ref.communityLater") }));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(mock.fetch.mock.calls.every(([path]) => path === "/referrals/community")).toBe(true);
});
it.each([null, "https://zalo.me.evil.example/g/QA"])(
  "does not show unconfigured or unsafe links",
  async (value) => {
    mock.fetch.mockResolvedValue({ url: value });
    mount(<ReferralCommunity />);
    await waitFor(() => expect(mock.fetch).toHaveBeenCalled());
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  },
);
it("allows Super Admin to configure or disable the invitation, never sends customer data", async () => {
  let current: string | null = null;
  mock.fetch.mockImplementation((path: string, init?: RequestInit) => {
    if (path === "/referrals/admin/community") {
      const data = JSON.parse(String(init?.body)) as { url: string };
      current = data.url || null;
    }
    return Promise.resolve({ url: current });
  });
  mount(<CommunitySettings />);
  const input = await screen.findByLabelText(translate("vi", "ref.communityLink"));
  fireEvent.change(input, { target: { value: "https://evil.example/g/QA" } });
  expect(screen.getByRole("button", { name: translate("vi", "common.save") })).toBeDisabled();
  fireEvent.change(input, { target: { value: url } });
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "common.save") }));
  expect(await screen.findByText(translate("vi", "ref.communityReady"))).toBeInTheDocument();
  expect(mock.fetch).toHaveBeenCalledWith(
    "/referrals/admin/community",
    expect.objectContaining({ method: "PUT", body: JSON.stringify({ url }) }),
  );
  fireEvent.change(screen.getByLabelText(translate("vi", "ref.communityLink")), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "common.save") }));
  expect(await screen.findByText(translate("vi", "ref.communityOff"))).toBeInTheDocument();
});
it("validates link without network or redirect", () => {
  expect(safeCommunityUrl(" https://zalo.me/g/ABCD/ ")).toBe("https://zalo.me/g/ABCD");
  expect(safeCommunityUrl("https://zalo.me/g/ABCD?phone=123")).toBeNull();
  expect(safeCommunityUrl("https://zalo.me@evil.example/g/ABCD")).toBeNull();
});
