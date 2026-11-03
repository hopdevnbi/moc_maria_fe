import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoelPromotionDialog } from "./noel-promotion";

vi.mock("next/image", () => ({ default: () => null }));
let number = 0;
const promotion = () => ({ id: `noel-${++number}`, endsAt: "2026-12-25T16:59:59.999Z" });
const show = () =>
  act(() => {
    vi.advanceTimersByTime(1200);
  });
beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T03:00:00Z"));
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

describe("homepage Noel invitation", () => {
  it("opens after a short delay, links the offers to the event, restores focus and appears once per session", () => {
    const initialFocus = document.createElement("button");
    document.body.append(initialFocus);
    initialFocus.focus();
    const data = promotion();
    const first = render(<NoelPromotionDialog promotion={data} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    show();
    expect(screen.getByRole("dialog", { name: /Quà Noel/ })).toBeInTheDocument();
    expect(screen.getByText("5 triệu")).toBeInTheDocument();
    expect(screen.getByText(/Voucher và quà Noel áp dụng điều kiện riêng/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem voucher đến 50%/ })).toHaveAttribute(
      "href",
      "https://event.mocmaria.com/#vuon-qua",
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Tôi sẽ xem sau" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.activeElement).toBe(initialFocus);
    first.unmount();
    render(<NoelPromotionDialog promotion={data} />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    initialFocus.remove();
  });
  it("lets native Escape dismiss the popup and release the scroll lock", () => {
    render(<NoelPromotionDialog promotion={promotion()} />);
    show();
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true, bubbles: false }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("does not cover another dialog or interrupt typing", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const first = render(<NoelPromotionDialog promotion={promotion()} />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    input.remove();
    render(
      <>
        <dialog open aria-label="Existing dialog" />
        <NoelPromotionDialog promotion={promotion()} />
      </>,
    );
    show();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
  it("never announces an expired campaign and cancels pending timers on navigation away", () => {
    const first = render(
      <NoelPromotionDialog promotion={{ ...promotion(), endsAt: "2026-11-01T00:00:00Z" }} />,
    );
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    const second = render(<NoelPromotionDialog promotion={promotion()} />);
    second.unmount();
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("still works once within the browser document when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const data = promotion();
    const first = render(<NoelPromotionDialog promotion={data} />);
    show();
    fireEvent.click(screen.getByRole("button", { name: "Đóng giới thiệu quà Noel" }));
    first.unmount();
    render(<NoelPromotionDialog promotion={data} />);
    show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
