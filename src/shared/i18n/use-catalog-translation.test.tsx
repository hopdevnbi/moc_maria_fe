import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "./locale-provider";
import { LanguageSelector } from "./language-selector";
import { LocalizedCatalogName } from "./localized-text";
const id = "12345678-1234-4234-8234-123456789012";
afterEach(() => {
  cleanup();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
  vi.unstubAllGlobals();
});
it("prefers approved database translations and never shows another locale during a switch", async () => {
  document.cookie = "moc_locale=en; Path=/";
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith("/en"))
      return new Response(
        JSON.stringify({
          entityId: id,
          kind: "service",
          requestedLocale: "en",
          locale: "en",
          name: "Approved English service",
          description: null,
        }),
      );
    return new Response(
      JSON.stringify({
        entityId: id,
        kind: "service",
        requestedLocale: "ja",
        locale: "vi",
        name: "Massage chân",
        description: null,
      }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <LocaleProvider enabled>
      <LanguageSelector />
      <LocalizedCatalogName name="Massage chân" id={id} />
    </LocaleProvider>,
  );
  await screen.findByText("Approved English service");
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  fireEvent.click(screen.getByRole("button", { name: "日本語" }));
  expect(screen.queryByText("Approved English service")).toBeNull();
  expect(await screen.findByText("フットマッサージ")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếng Việt" }));
  expect(screen.getByText("Massage chân")).toBeInTheDocument();
});
