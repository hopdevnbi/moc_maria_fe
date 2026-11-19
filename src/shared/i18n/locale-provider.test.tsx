import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "./locale-provider";
import { LanguageSelector } from "./language-selector";
import { MobileNavigation } from "@/features/mobile/mobile-navigation";

function Preview() {
  const { locale, t } = useLocale();
  return (
    <>
      <output>{locale}</output>
      <p>{t("home.hero1")}</p>
      <LanguageSelector />
      <MobileNavigation />
    </>
  );
}
afterEach(() => {
  cleanup();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
  vi.unstubAllGlobals();
});
describe("locale integration", () => {
  it("detects country locale and preserves manual choice across reload", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ locale: "ko" }) });
    vi.stubGlobal("fetch", fetcher);
    const { unmount } = render(
      <LocaleProvider enabled>
        <Preview />
      </LocaleProvider>,
    );
    await screen.findByText("잠시의 평온.");
    expect(screen.getByRole("link", { name: "서비스" })).toHaveAttribute("href", "/dich-vu");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ja" } });
    expect(screen.getByText("ひとときの安らぎ。")).toBeInTheDocument();
    expect(document.cookie).toContain("moc_locale=ja");
    unmount();
    render(
      <LocaleProvider enabled>
        <Preview />
      </LocaleProvider>,
    );
    await screen.findByText("ひとときの安らぎ。");
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "auto" } });
    await screen.findByText("잠시의 평온.");
    expect(document.cookie).not.toContain("moc_locale=");
  });
  it("keeps Vietnamese when disabled or detection fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { unmount } = render(
      <LocaleProvider enabled={false}>
        <Preview />
      </LocaleProvider>,
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Một chút an yên.")).toBeInTheDocument();
    unmount();
    render(
      <LocaleProvider enabled>
        <Preview />
      </LocaleProvider>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByText("Một chút an yên.")).toBeInTheDocument();
  });
});
