import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { LanguageSelector } from "@/shared/i18n/language-selector";
import { KtvPublicDetail } from "./ktv-showcase";
import { EMPTY_KTV_SHOWCASE } from "./ktv-showcase-types";
import type { Provider } from "@/features/marketplace/types";
vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
vi.mock("./ktv-showcase-editor", () => ({ KtvShowcaseEditorLauncher: () => null }));
vi.mock("./ktv-tip", () => ({ KtvTipPanel: () => null }));
vi.mock("@/features/provider-reviews/reviews", () => ({
  ProviderRating: () => null,
  ProviderReviews: () => null,
}));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
});
describe("KTV public detail locale", () => {
  it("translates working hours and known offers while preserving identity, original biography and booking links", async () => {
    document.cookie = "moc_locale=en; Path=/";
    const provider: Provider = {
      id: "ktv-1",
      publicName: "Nguyễn Hoàn",
      avatarUrl: null,
      introduction: "Thông tin gốc",
      serviceArea: "Hà Nội",
      chatEnabled: true,
    };
    render(
      <LocaleProvider enabled>
        <LanguageSelector />
        <KtvPublicDetail
          provider={provider}
          profileId="ktv-1"
          offers={[
            { id: "offer-1", name: "Massage chân", price: 159000, bookingServiceId: "service-1" },
          ]}
          showcase={{
            ...EMPTY_KTV_SHOWCASE,
            weeklyHours: [{ weekday: 1, startsAt: "09:00", endsAt: "17:00" }],
          }}
        />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "Working hours" });
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("09:00–17:00")).toBeInTheDocument();
    expect(screen.getByText("Thông tin gốc")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Foot massage" })).toBeInTheDocument();
    const href = screen.getByRole("link", { name: "Send request" }).getAttribute("href");
    expect(href).toContain("service-1");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ja" } });
    expect(screen.getByRole("heading", { name: "勤務時間" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "リクエスト送信" })).toHaveAttribute("href", href);
    expect(screen.getByRole("heading", { name: "Nguyễn Hoàn" })).toBeInTheDocument();
  });
});
