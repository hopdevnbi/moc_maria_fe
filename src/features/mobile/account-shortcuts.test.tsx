import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountShortcuts } from "./account-shortcuts";

afterEach(() => cleanup());

describe("AccountShortcuts", () => {
  it("prioritizes booking then KTV for customers, and separates account/security actions", () => {
    render(<AccountShortcuts technician={false} signingOut={false} onSignOut={vi.fn()} />);
    const journey = screen.getByRole("region", { name: "Hành động nhanh" });
    const journeys = within(journey).getAllByRole("link");
    expect(journeys.map((link) => link.getAttribute("href"))).toEqual([
      "/dat-lich",
      "/chuyen-vien",
    ]);
    expect(journeys[0]).toHaveTextContent("Đặt lịch chăm sóc");
    expect(journeys[1]).toHaveTextContent("Chọn KTV & Chat");

    const security = screen.getByRole("region", { name: "Tài khoản & bảo mật" });
    expect(within(security).getByRole("link", { name: /Thông tin của tôi/ })).toHaveAttribute(
      "href",
      "#thong-tin-tai-khoan",
    );
    expect(within(security).getByRole("link", { name: /Đổi mật khẩu/ })).toHaveAttribute(
      "href",
      "#doi-mat-khau",
    );
    expect(within(security).getByRole("button", { name: "Đăng xuất" })).toBeEnabled();
  });

  it("preserves technician links rather than showing customer booking", () => {
    render(<AccountShortcuts technician signingOut={false} onSignOut={vi.fn()} />);
    const journeys = within(screen.getByRole("region", { name: "Hành động nhanh" })).getAllByRole(
      "link",
    );
    expect(journeys.map((link) => link.getAttribute("href"))).toEqual([
      "/tin-nhan",
      "#lich-lam-viec",
    ]);
    expect(journeys[0]).toHaveTextContent("Trả lời khách hàng");
    expect(journeys[1]).toHaveTextContent("Lịch làm việc");
    expect(screen.queryByText("Đặt lịch chăm sóc")).not.toBeInTheDocument();
  });

  it("invokes logout and disables the control while the operation is pending", () => {
    const onSignOut = vi.fn();
    const { rerender } = render(
      <AccountShortcuts technician={false} signingOut={false} onSignOut={onSignOut} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);

    rerender(<AccountShortcuts technician={false} signingOut onSignOut={onSignOut} />);
    const button = screen.getByRole("button", { name: "Đang đăng xuất..." });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
