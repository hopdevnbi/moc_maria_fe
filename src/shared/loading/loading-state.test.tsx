import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadingState } from "./loading-state";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { LOCALES } from "@/shared/i18n/locale";
import { translate } from "@/shared/i18n/messages";
import { LanguageSelector } from "@/shared/i18n/language-selector";
import { fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.cookie = "moc_locale=; Path=/; Max-Age=0";
});

describe("honest loading feedback", () => {
  it.each(LOCALES)(
    "uses the selected %s locale for all homepage loading text and slow guidance",
    (locale) => {
      vi.useFakeTimers();
      document.cookie = "moc_locale=" + locale + "; Path=/";
      render(
        <LocaleProvider enabled>
          <LoadingState titleKey="loading.home" descriptionKey="loading.homeDesc" shape="cards" />
        </LocaleProvider>,
      );
      act(() => vi.advanceTimersByTime(1));
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(translate(locale, "loading.home"));
      expect(status).toHaveTextContent(translate(locale, "loading.homeDesc"));
      expect(status).toHaveTextContent(translate(locale, "loading.patience"));
      act(() => vi.advanceTimersByTime(7999));
      expect(status).toHaveTextContent(translate(locale, "loading.slow"));
      expect(status.closest(".moc-loading")).toHaveAttribute("lang", locale);
    },
  );
  it("switches language during loading without resetting the slow timer or altering the provider name", () => {
    vi.useFakeTimers();
    document.cookie = "moc_locale=en; Path=/";
    render(
      <LocaleProvider enabled>
        <LanguageSelector />
        <LoadingState titleKey="loading.chatWith" values={{ name: "Nguyễn Hoàn" }} description="" />
      </LocaleProvider>,
    );
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole("status")).toHaveTextContent("Opening chat with Nguyễn Hoàn");
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "日本語" }));
    expect(screen.getByRole("status")).toHaveTextContent("Nguyễn Hoànとのチャットを開いています");
    expect(screen.getByRole("status")).toHaveTextContent(translate("ja", "loading.slow"));
    expect(screen.queryByText("Opening chat with Nguyễn Hoàn")).not.toBeInTheDocument();
  });
  it("offers slow-connection guidance only after eight seconds and clears its timer on removal", () => {
    vi.useFakeTimers();
    const { unmount } = render(<LoadingState title="Đang tải hội thoại…" shape="messages" />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải hội thoại…");
    expect(screen.queryByText(/Kết nối đang chậm/)).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(7_999));
    expect(screen.queryByText(/Kết nối đang chậm/)).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText(/Kết nối đang chậm/)).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("cancels pending guidance for a fast response instead of imposing an artificial wait", () => {
    vi.useFakeTimers();
    const { rerender } = render(<LoadingState shape="cards" />);
    expect(vi.getTimerCount()).toBe(1);
    rerender(<p>Nội dung đã sẵn sàng</p>);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Nội dung đã sẵn sàng")).toBeInTheDocument();
  });
});
