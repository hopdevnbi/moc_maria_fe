import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadingState } from "./loading-state";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("honest loading feedback", () => {
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
