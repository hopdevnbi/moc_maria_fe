import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReferralAdmin, ReferralCard } from "./referrals";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { LOCALES } from "@/shared/i18n/locale";
import { translate } from "@/shared/i18n/messages";
import { toDataURL } from "qrcode";
vi.mock("qrcode", () => ({ toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,AA==") }));
const mock = vi.hoisted(() => ({
  user: { id: "user", isActive: true, roles: ["CUSTOMER"], permissions: ["customer.portal"] },
  fetch: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mock.user, authFetch: mock.fetch }),
}));
const data = {
  code: "0123456789ABCDEFABCD",
  enabled: true,
  rewardCoins: 100,
  registered: 2,
  rewarded: 1,
  coins: 100,
  verificationAvailable: false,
  verificationStatus: null,
  hasPhone: true,
};
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
  mock.user.roles = ["CUSTOMER"];
  mock.user.permissions = ["customer.portal"];
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
});
it.each(LOCALES)("renders the referral card in %s", async (locale) => {
  document.cookie = "moc_locale=" + locale + "; Path=/";
  mock.fetch.mockResolvedValue(data);
  mount(<ReferralCard />);
  expect(await screen.findByText(translate(locale, "ref.title"))).toBeInTheDocument();
  expect(await screen.findByDisplayValue(data.code)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: translate(locale, "ref.copy") })).toBeInTheDocument();
});
it.each(["ADMIN", "THERAPIST", "CUSTOMER"])("never loads the admin risk list for %s", (role) => {
  mock.user.roles = [role];
  mock.user.permissions = ["admin.portal"];
  mount(<ReferralAdmin />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(mock.fetch).not.toHaveBeenCalled();
});
it("generates referral QR locally with the exact public link and allows hiding it", async () => {
  mock.fetch.mockResolvedValue(data);
  mount(<ReferralCard />);
  fireEvent.click(await screen.findByRole("button", { name: translate("vi", "ref.qrShow") }));
  expect(await screen.findByRole("img", { name: translate("vi", "ref.qr") })).toBeInTheDocument();
  expect(toDataURL).toHaveBeenCalledWith("https://mocmaria.com/r/" + data.code, expect.any(Object));
  expect(screen.getByRole("link", { name: translate("vi", "ref.qrDownload") })).toHaveAttribute(
    "download",
    "moc-maria-referral.png",
  );
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "ref.qrHide") }));
  expect(screen.queryByRole("img", { name: translate("vi", "ref.qr") })).not.toBeInTheDocument();
});
it("admin review is only an acknowledgement; no rejection or award command", async () => {
  mock.user.roles = ["SUPER_ADMIN"];
  mock.user.permissions = ["admin.portal"];
  mock.fetch.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes("/settings")
        ? { enabled: true, rewardCoins: 100, payoutEnabled: false, verificationConfigured: false }
        : path.includes("/review")
          ? { reviewed: true }
          : {
              items: [
                {
                  id: "qa",
                  referrerName: "A",
                  referredName: "B",
                  status: "PENDING_VERIFICATION",
                  rewardCoins: 100,
                  createdAt: "2026-11-20T00:00:00Z",
                  riskScore: 100,
                  riskFlags: ["SHARED_BROWSER"],
                  reviewedAt: null,
                },
              ],
              hasMore: false,
            },
    ),
  );
  mount(<ReferralAdmin />);
  expect(await screen.findByText("100/100")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "ref.review") }));
  await waitFor(() =>
    expect(mock.fetch).toHaveBeenCalledWith("/referrals/admin/qa/review", { method: "POST" }),
  );
  expect(screen.getByText(translate("vi", "ref.pending"), { exact: false })).toBeInTheDocument();
});
