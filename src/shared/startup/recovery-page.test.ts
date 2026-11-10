import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IOS_COMPATIBILITY_SCRIPT } from "./ios-compatibility";

const html = readFileSync("public/pwa/recover.html", "utf8");
const script = readFileSync("public/pwa/recover.js", "utf8");

function start({
  search = "",
  ios = "16_1_2",
  caches,
  serviceWorker,
}: {
  search?: string;
  ios?: string;
  caches?: unknown;
  serviceWorker?: unknown;
} = {}) {
  document.documentElement.innerHTML = html;
  const replace = vi.fn();
  const pageWindow = {
    location: { origin: "https://mocmaria.com", search, replace },
    setTimeout,
    clearTimeout,
    ...(caches ? { caches } : {}),
  };
  const navigator = {
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios} like Mac OS X)`,
    standalone: true,
    onLine: true,
    ...(serviceWorker ? { serviceWorker } : {}),
  };
  runInNewContext(script, { document, window: pageWindow, navigator, Promise, Date });
  return { replace, click: () => document.getElementById("refresh-app")!.click() };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-moc-old-ios");
});

describe("standalone recovery without the application bundle", () => {
  it.each([
    ["15_8_5", true],
    ["16_1_2", true],
    ["16_3", true],
    ["16_4", false],
    ["18_7", false],
    ["26_0", false],
  ])("detects iOS %s from the initial HTML without React", (version, unsupported) => {
    runInNewContext(IOS_COMPATIBILITY_SCRIPT, {
      document,
      navigator: { userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${version} like Mac OS X)` },
    });
    expect(document.documentElement.hasAttribute("data-moc-old-ios")).toBe(unsupported);
  });

  it("bypasses the app service worker for the recovery page and its script", () => {
    const listeners: Record<string, (event: unknown) => void> = {};
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      self: {
        location: { origin: "https://mocmaria.com" },
        addEventListener: (name: string, listener: (event: unknown) => void) => {
          listeners[name] = listener;
        },
      },
      URL,
    });
    for (const path of ["/pwa/recover.html?returnTo=%2Ftai-khoan", "/pwa/recover.js"]) {
      const respondWith = vi.fn();
      listeners.fetch({
        request: { method: "GET", mode: "navigate", url: "https://mocmaria.com" + path },
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });

  it("offers a native reload link even when no JavaScript has run", () => {
    document.documentElement.innerHTML = html;
    expect(document.querySelector<HTMLAnchorElement>("#reopen")!.getAttribute("href")).toBe(
      "/tai-khoan?moc_reload=1",
    );
    expect(document.querySelector("noscript")!.textContent).toContain("JavaScript");
  });

  it("explains the minimum iOS version without identifying an account", () => {
    start();
    expect(document.getElementById("device-info")!.textContent).toContain("iOS 16.1.2");
    expect(document.getElementById("ios-help")!.textContent).toContain("cũ hơn");
    const sections = Array.from(document.querySelectorAll("section"));
    expect(sections[0].id).toBe("browser-check");
    start({ ios: "16_4" });
    expect(document.getElementById("ios-help")!.textContent).not.toContain("cũ hơn");
  });

  it.each(["https://evil.invalid", "//evil.invalid", "/api/auth/logout", "%broken"])(
    "does not navigate to an unsafe return target: %s",
    (target) => {
      start({ search: "?returnTo=" + encodeURIComponent(target) });
      expect(document.querySelector<HTMLAnchorElement>("#reopen")!.getAttribute("href")).toMatch(
        /^\/tai-khoan\?moc_reload=\d+$/,
      );
    },
  );

  it("updates only Moc's worker and offline cache, preserving cookies and other apps", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const otherUpdate = vi.fn();
    const deleteCache = vi.fn().mockResolvedValue(true);
    const { click, replace } = start({
      search: "?returnTo=%2Fcheck-in",
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([
          {
            scope: "https://mocmaria.com/",
            active: { scriptURL: "https://mocmaria.com/sw.js" },
            update,
          },
          {
            scope: "https://mocmaria.com/other/",
            active: { scriptURL: "https://mocmaria.com/other/sw.js" },
            update: otherUpdate,
          },
        ]),
      },
      caches: {
        keys: vi.fn().mockResolvedValue(["moc-maria-pwa-offline-v1", "another-app"]),
        delete: deleteCache,
      },
    });
    const cookie = document.cookie;
    click();
    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(update).toHaveBeenCalledOnce();
    expect(otherUpdate).not.toHaveBeenCalled();
    expect(deleteCache.mock.calls).toEqual([["moc-maria-pwa-offline-v1"]]);
    expect(document.cookie).toBe(cookie);
    expect(replace.mock.calls[0][0]).toMatch(/^\/check-in\?moc_reload=\d+$/);
  });

  it("still reopens if Safari storage is blocked", async () => {
    const { click, replace } = start({
      caches: {
        keys: () => {
          throw new Error("SecurityError");
        },
      },
      serviceWorker: { getRegistrations: vi.fn().mockRejectedValue(new Error("blocked")) },
    });
    click();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(document.getElementById("result")!.textContent).toContain("Chưa làm mới được toàn bộ");
  });

  it("leaves a hung storage call within three seconds and never navigates twice", async () => {
    vi.useFakeTimers();
    let settle!: (keys: string[]) => void;
    const { click, replace } = start({
      caches: {
        keys: () =>
          new Promise<string[]>((resolve) => {
            settle = resolve;
          }),
      },
    });
    click();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(replace).toHaveBeenCalledOnce();
    expect(document.getElementById("result")!.textContent).toContain("Chưa làm mới được toàn bộ");
    settle([]);
    await vi.advanceTimersByTimeAsync(100);
    expect(replace).toHaveBeenCalledOnce();
  });
});
