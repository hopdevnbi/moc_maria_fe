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
  it("renders six real flag options, returns focus on Escape, and saves the active locale", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ locale: "vi" }) }),
    );
    const { container } = render(
      <LocaleProvider enabled>
        <Preview />
      </LocaleProvider>,
    );
    const trigger = screen.getByRole("button", { expanded: false });
    expect(trigger.querySelector('svg[data-flag="vi"]')).not.toBeNull();
    fireEvent.click(trigger);
    expect(container.querySelectorAll(".moc-language-option svg[data-flag]")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Tiếng Việt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Tiếng Việt" })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Tiếng Việt" }));
    expect(document.cookie).toContain("moc_locale=vi");
  });
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
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "日本語" }));
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
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "国に応じて自動選択" }));
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
    expect(screen.queryByRole("button", { expanded: false })).not.toBeInTheDocument();
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
