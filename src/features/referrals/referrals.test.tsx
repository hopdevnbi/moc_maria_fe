import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReferralAdmin, ReferralCard } from "./referrals";
import { ApiError } from "@/features/auth/auth-api";
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
  registered: 0,
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
it.each(LOCALES)("email OTP is first and SMS remains disabled for Trial in %s", async (locale) => {
  document.cookie = "moc_locale=" + locale + "; Path=/";
  mock.fetch.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/referrals/me"
        ? {
            ...data,
            verificationAvailable: true,
            verificationStatus: "PENDING_VERIFICATION",
            verificationChannels: { email: true, sms: false },
            hasEmail: true,
          }
        : { sent: true, channel: "email" },
    ),
  );
  mount(<ReferralCard />);
  expect(
    await screen.findByRole("button", { name: translate(locale, "ref.emailChannel") }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: translate(locale, "ref.smsChannel") })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: translate(locale, "ref.sendOtp") }));
  await waitFor(() =>
    expect(mock.fetch).toHaveBeenCalledWith(
      "/referrals/verify/email/start",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ locale }),
      }),
    ),
  );
  expect(mock.fetch).not.toHaveBeenCalledWith("/referrals/verify/start", expect.anything());
});
it("guides actual email verification, enforces six digits and handles invalid code", async () => {
  mock.fetch.mockImplementation((path: string) =>
    path === "/referrals/me"
      ? Promise.resolve({
          ...data,
          verificationAvailable: true,
          verificationStatus: "PENDING_VERIFICATION",
          verificationChannels: { email: true, sms: false },
          hasEmail: true,
        })
      : path === "/referrals/verify/email/start"
        ? Promise.resolve({ sent: true, channel: "email" })
        : Promise.reject(new ApiError(400, "REFERRAL_OTP_INVALID", null)),
  );
  mount(<ReferralCard />);
  expect(await screen.findByText(translate("vi", "ref.otpInstructions"))).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "ref.sendOtp") }));
  expect(await screen.findByText(translate("vi", "ref.otpInboxHint"))).toBeInTheDocument();
  const code = screen.getByRole("textbox", { name: translate("vi", "ref.otp") });
  expect(code).toHaveAttribute("maxLength", "6");
  fireEvent.change(code, { target: { value: "12345" } });
  expect(screen.getByRole("button", { name: translate("vi", "ref.confirm") })).toBeDisabled();
  fireEvent.change(code, { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "ref.confirm") }));
  expect(await screen.findByText(translate("vi", "ref.otpInvalid"))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: translate("vi", "ref.otpRetry") })).toBeEnabled();
});
it("shows exact committed reward, pages own history and never exposes risk", async () => {
  const awardedAt = "2026-11-20T03:00:00Z";
  mock.fetch.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/referrals/me"
        ? { ...data, registered: 21, latestReward: { id: "r1", amount: 100, awardedAt } }
        : path.endsWith("page=2")
          ? {
              items: [
                {
                  id: "r2",
                  status: "PENDING_VERIFICATION",
                  rewardCoins: 100,
                  createdAt: awardedAt,
                  awardedAt: null,
                  earnedCoins: 0,
                },
              ],
              hasMore: false,
            }
          : {
              items: [
                {
                  id: "r1",
                  status: "REWARDED",
                  rewardCoins: 100,
                  createdAt: awardedAt,
                  awardedAt,
                  earnedCoins: 100,
                },
              ],
              hasMore: true,
            },
    ),
  );
  mount(<ReferralCard />);
  expect(
    await screen.findByText(translate("vi", "ref.receipt").replace("{n}", "100")),
  ).toBeInTheDocument();
  expect(
    await screen.findByText(translate("vi", "ref.earned").replace("{n}", "100")),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: translate("vi", "ref.next") }));
  expect(
    await screen.findByText(translate("vi", "ref.expected").replace("{n}", "100")),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: translate("vi", "ref.next") })).toBeDisabled();
  expect(mock.fetch).toHaveBeenCalledWith(
    "/referrals/me/history?page=2",
    expect.objectContaining({ cache: "no-store" }),
  );
  expect(screen.queryByText(translate("vi", "ref.risk"))).not.toBeInTheDocument();
});
it.each(LOCALES)(
  "shows masked verification proof in own rewarded history in %s",
  async (locale) => {
    document.cookie = "moc_locale=" + locale + "; Path=/";
    mock.fetch.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/referrals/me"
          ? { ...data, registered: 1 }
          : {
              items: [
                {
                  id: "verified",
                  status: "REWARDED",
                  rewardCoins: 100,
                  createdAt: "2026-11-23T04:38:00Z",
                  awardedAt: "2026-11-23T04:57:00Z",
                  earnedCoins: 100,
                  verifiedChannel: "email",
                  maskedVerifiedContact: "p***@gmail.com",
                },
              ],
              hasMore: false,
            },
      ),
    );
    mount(<ReferralCard />);
    expect(
      await screen.findByText(`${translate(locale, "ref.verifiedEmail")}: p***@gmail.com`),
    ).toBeInTheDocument();
    expect(screen.queryByText("person@gmail.com")).not.toBeInTheDocument();
  },
);
it.each(LOCALES)("shows masked verified email in latest reward receipt in %s", async (locale) => {
  document.cookie = "moc_locale=" + locale + "; Path=/";
  mock.fetch.mockResolvedValue({
    ...data,
    latestReward: {
      id: "latest",
      amount: 100,
      awardedAt: "2026-11-23T04:57:00Z",
      verifiedChannel: "email",
      maskedVerifiedContact: "p***@gmail.com",
    },
  });
  mount(<ReferralCard />);
  expect(
    await screen.findByText(`${translate(locale, "ref.verifiedEmail")}: p***@gmail.com`),
  ).toBeInTheDocument();
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
