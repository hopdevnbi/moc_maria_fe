import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallAssistant } from "./pwa-install-assistant";
import { PwaInstallShortcut } from "./pwa-install-shortcut";
import { PWA_DISMISSED_KEY, PWA_OPEN_EVENT } from "./pwa-install-utils";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

const defaultAgent = navigator.userAgent;
let standalone = false;
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  route.pathname = "/";
  standalone = false;
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 16; Pixel 9) Chrome/140.0",
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("standalone") ? standalone : true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: defaultAgent });
  document.body.style.overflow = "";
});

async function mount() {
  render(<PwaInstallAssistant />);
  await act(async () => {
    vi.advanceTimersByTime(1);
  });
}

describe("responsive PWA installation UX", () => {
  it("shows a small invitation after engagement, supports postponing it for seven days", async () => {
    await mount();
    expect(screen.queryByText("Mộc Maria trên điện thoại")).not.toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await act(async () => {
      vi.advanceTimersByTime(14_000);
    });
    expect(screen.getByText("Mộc Maria trên điện thoại")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Để sau, ẩn lời mời/ }));
    expect(screen.queryByText("Mộc Maria trên điện thoại")).not.toBeInTheDocument();
    expect(Number(localStorage.getItem(PWA_DISMISSED_KEY))).toBeGreaterThan(Date.now());
  });

  it("allows the account shortcut to open an Android install dialog and call the native prompt", async () => {
    await mount();
    render(<PwaInstallShortcut />);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: typeof prompt;
      userChoice: Promise<{ outcome: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });
    act(() => window.dispatchEvent(installEvent));
    fireEvent.click(screen.getByRole("button", { name: "Cài Mộc Maria" }));
    expect(
      within(screen.getByRole("dialog")).getByText("Chạm một lần, gần Mộc hơn."),
    ).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Cài Mộc Maria/ }),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("guides iPhone through Safari Share and Add to Home Screen without pretending to install automatically", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0) Safari",
    });
    await mount();
    act(() => window.dispatchEvent(new Event(PWA_OPEN_EVENT)));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Chọn “Thêm vào Màn hình chính”/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Mở dưới dạng ứng dụng web/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Cài Mộc Maria" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Đã hiểu/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("helps Facebook in-app visitors open Mộc in Safari instead of pretending native install works", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0) FBAN/FBIOS;FBAV/500",
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await mount();
    act(() => window.dispatchEvent(new Event(PWA_OPEN_EVENT)));
    expect(screen.getByText("Bạn đang xem qua ứng dụng mạng xã hội")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sao chép đường dẫn Mộc Maria" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("https://mocmaria.com/");
    expect(screen.getByText("Đã sao chép mocmaria.com")).toBeInTheDocument();
  });

  it("never offers installation to an already installed standalone user or inside chat", async () => {
    standalone = true;
    await mount();
    act(() => window.dispatchEvent(new Event(PWA_OPEN_EVENT)));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();
    standalone = false;
    route.pathname = "/tin-nhan";
    await mount();
    fireEvent.pointerDown(document.body);
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.queryByText("Mộc Maria trên điện thoại")).not.toBeInTheDocument();
  });
});
