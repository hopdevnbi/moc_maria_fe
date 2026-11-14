import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let Dialog: typeof import("./first-visit-promotion").FirstVisitPromotionDialog;
const show = () =>
  act(() => {
    vi.advanceTimersByTime(1200);
  });

beforeEach(async () => {
  vi.resetModules();
  Dialog = (await import("./first-visit-promotion")).FirstVisitPromotionDialog;
  sessionStorage.clear();
  vi.useFakeTimers();
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
  vi.restoreAllMocks();
});

describe("homepage first-visit offer", () => {
  it("shows the responsive poster and booking link once per tab, restores focus and scroll", () => {
    const initialFocus = document.createElement("button");
    document.body.append(initialFocus);
    initialFocus.focus();
    const first = render(<Dialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    show();
    expect(screen.getByRole("dialog", { name: /Ưu đãi trải nghiệm lần đầu/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /99K/ })).toHaveAttribute(
      "src",
      "/promotions/first-visit-99k-v1-768.jpg",
    );
    expect(screen.getByRole("link", { name: "Đặt lịch ngay" })).toHaveAttribute(
      "href",
      "/dat-lich",
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Đóng ưu đãi" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.activeElement).toBe(initialFocus);
    first.unmount();
    render(<Dialog />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    initialFocus.remove();
  });

  it("dismisses with Escape", () => {
    render(<Dialog />);
    show();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not interrupt typing or cover another dialog", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const first = render(<Dialog />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    input.remove();
    render(
      <>
        <dialog open aria-label="Existing dialog" />
        <Dialog />
      </>,
    );
    show();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("does not reopen if previously seen in the tab", () => {
    sessionStorage.setItem("mm:first-visit-99k:v1", "seen");
    render(<Dialog />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses a document guard if storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const first = render(<Dialog />);
    show();
    fireEvent.click(screen.getByRole("button", { name: "Đóng ưu đãi" }));
    first.unmount();
    render(<Dialog />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels scheduled opening on navigation away", () => {
    const first = render(<Dialog />);
    first.unmount();
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    render(<Dialog />);
    show();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
