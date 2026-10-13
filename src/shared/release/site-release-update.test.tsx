import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteReleaseUpdate } from "./site-release-update";
const state = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
const CURRENT = "a".repeat(40);
const NEXT = "b".repeat(40);

beforeEach(() => {
  vi.useFakeTimers();
  state.pathname = "/";
  sessionStorage.clear();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: NEXT }) }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function mount(children?: React.ReactNode) {
  const reload = vi.fn();
  await act(async () => {
    render(
      <>
        {children}
        <SiteReleaseUpdate currentVersion={CURRENT} reload={reload} />
      </>,
    );
  });
  return reload;
}
describe("deployment update recovery", () => {
  it("automatically updates an idle public page using an uncached anonymous version check", async () => {
    localStorage.setItem("auth-sentinel", "preserve");
    const reload = await mount();
    expect(screen.getByText("Trang đã có bản cập nhật mới.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/release",
      expect.objectContaining({ cache: "no-store", credentials: "omit" }),
    );
    await act(async () => {
      vi.advanceTimersByTime(14999);
    });
    expect(reload).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("auth-sentinel")).toBe("preserve");
  });
  it.each(["/tin-nhan", "/dat-lich", "/dang-nhap", "/quan-tri/ktv"])(
    "keeps %s intact until the customer chooses to update",
    async (pathname) => {
      state.pathname = pathname;
      const reload = await mount();
      await act(async () => {
        vi.advanceTimersByTime(120000);
      });
      expect(reload).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Cập nhật trang" }));
      expect(reload).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves input in a public search, then updates after it is cleared and idle", async () => {
    const reload = await mount(<input aria-label="Search" defaultValue="Gội đầu sạch" />);
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Search")).toHaveValue("Gội đầu sạch");
    fireEvent.input(screen.getByLabelText("Search"), { target: { value: "" } });
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("does not show an update when the page matches production", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: CURRENT }),
    } as Response);
    const reload = await mount();
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
  it("keeps a selected form option intact on a public profile", async () => {
    state.pathname = "/chuyen-vien/linh-anh";
    const reload = await mount(<input aria-label="Review rating" type="radio" defaultChecked />);
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Review rating")).toBeChecked();
  });
  it("waits for browsing activity to finish before automatically updating", async () => {
    const reload = await mount();
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    fireEvent.wheel(document);
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(reload).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("avoids reload loops when an old page is returned after an attempted update", async () => {
    sessionStorage.setItem("mocmaria.release.reload." + CURRENT, NEXT);
    const reload = await mount();
    await act(async () => {
      vi.advanceTimersByTime(120000);
    });
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cập nhật trang" })).toBeInTheDocument();
  });
  it("checks again when returning online without interrupting an offline page", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const reload = await mount();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(16000);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
