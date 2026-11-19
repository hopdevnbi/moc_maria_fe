import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { LanguageSelector } from "@/shared/i18n/language-selector";
import { LOCALES } from "@/shared/i18n/locale";
import { menuName, menuNames } from "@/shared/i18n/menu-names";
import { careMenu, drinkMenu } from "./official-menu";
import { OfficialMenuPage } from "./official-menu-page";
vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
  vi.unstubAllGlobals();
});
describe("localized official price list", () => {
  it("covers every official item and preserves unknown source content", () => {
    expect(menuNames).toHaveLength(31);
    for (const item of [...careMenu, ...drinkMenu.flatMap((s) => s.items)]) {
      expect(menuNames).toContain(item.name);
      for (const locale of LOCALES) expect(menuName(locale, item.name)).not.toBe("");
      expect(menuName("vi", item.name)).toBe(item.name);
    }
    expect(menuName("en", "New service")).toBe("New service");
  });
  it("switches languages and searches translated names without changing prices or routes", async () => {
    document.cookie = "moc_locale=en; Path=/";
    render(
      <LocaleProvider enabled>
        <LanguageSelector />
        <OfficialMenuPage services={[]} />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "Foot massage" });
    fireEvent.change(screen.getByRole("textbox", { name: "Search the price list" }), {
      target: { value: "Foot massage" },
    });
    expect(screen.getByRole("heading", { name: "Foot massage" })).toBeInTheDocument();
    expect(screen.getByText("159.000 ₫")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View therapists" })).toHaveAttribute(
      "href",
      "/chuyen-vien",
    );
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "日本語" }));
    fireEvent.change(screen.getByRole("textbox", { name: "料金表を検索" }), {
      target: { value: "フットマッサージ" },
    });
    expect(screen.getByRole("heading", { name: "フットマッサージ" })).toBeInTheDocument();
  });
});
