import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { LanguageSelector } from "@/shared/i18n/language-selector";
import { LOCALES } from "@/shared/i18n/locale";
import { translate } from "@/shared/i18n/messages";
import { CustomerAccountProfile, type CustomerSelfProfile } from "./customer-account-profile";
import { AccountShortcuts } from "./account-shortcuts";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  refresh: vi.fn(),
  user: { id: "customer", roles: ["CUSTOMER"], permissions: ["customer.portal"], isActive: true },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, authFetch: mocks.fetch, refresh: mocks.refresh }),
}));
vi.mock("next/image", () => ({ default: () => null }));
const profile: CustomerSelfProfile = {
  id: "customer",
  displayName: "Nguyễn Hợp",
  email: "customer@example.test",
  phone: "0123456789",
  roles: ["CUSTOMER"],
  avatarUploadEnabled: true,
  customer: { id: "c", birthday: "1990-01-01", avatarUrl: null },
  membership: { tier: "VIP", level: 1, expiresAt: "2099-01-14T00:00:00Z", startedAt: null },
};
afterEach(() => {
  cleanup();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
  mocks.fetch.mockReset();
});
function mount(locale: string) {
  document.cookie = "moc_locale=" + locale + "; Path=/";
  mocks.fetch.mockResolvedValue(profile);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LocaleProvider enabled>
        <LanguageSelector />
        <CustomerAccountProfile />
        <AccountShortcuts technician={false} signingOut={false} onSignOut={vi.fn()} />
        <ChangePasswordForm />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}
it.each(LOCALES)(
  "localizes the profile, VIP, avatar, shortcuts and security in %s",
  async (locale) => {
    mount(locale);
    await screen.findByRole("region", { name: translate(locale, "cp.profile") });
    expect(screen.getByText(translate(locale, "cp.personal"))).toBeInTheDocument();
    expect(screen.getByLabelText(translate(locale, "cp.changePhoto"))).toBeInTheDocument();
    expect(screen.getByText(translate(locale, "cp.vipThanks"))).toBeInTheDocument();
    expect(
      screen.getByText(translate(locale, "auth.vipActive").replace("{level}", "VIP 1")),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: translate(locale, "cp.security") }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(translate(locale, "cp.newPassword"))).toBeInTheDocument();
    expect(screen.getByDisplayValue("Nguyễn Hợp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("customer@example.test")).toBeInTheDocument();
  },
);
it("switches language while retaining unsaved profile changes and localized validation", async () => {
  mount("en");
  const input = await screen.findByLabelText("Full name");
  fireEvent.change(input, { target: { value: "New name" } });
  const avatar = screen.getByLabelText("Change profile photo");
  fireEvent.change(avatar, {
    target: { files: [new File(["x"], "x.txt", { type: "text/plain" })] },
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Choose a JPG, PNG or WebP image up to 5 MB.",
  );
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  fireEvent.click(screen.getByRole("button", { name: "日本語" }));
  expect(screen.getByDisplayValue("New name")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(translate("ja", "cp.avatarInvalid"));
  expect(screen.getByLabelText(translate("ja", "cp.changePhoto"))).toBeInTheDocument();
});
