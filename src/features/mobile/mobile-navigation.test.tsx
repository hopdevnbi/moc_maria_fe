import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MobileNavigation } from "./mobile-navigation";

afterEach(cleanup);
describe("shared mobile navigation", () => {
  it("keeps the existing five main-site destinations and KTV detail selection", () => {
    render(<MobileNavigation active="providers" />);
    const links = within(screen.getByRole("navigation", { name: "Điều hướng nhanh" })).getAllByRole(
      "link",
    );
    expect(links.map((link) => link.textContent)).toEqual([
      "KTV",
      "Dịch vụ",
      "Đặt lịch",
      "Chat",
      "Tài khoản",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/dich-vu",
      "/dat-lich",
      "/tin-nhan",
      "/tai-khoan",
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });
  it("takes event visitors directly to all five main-site pages without a false current tab", () => {
    render(<MobileNavigation mainSite active={null} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://mocmaria.com/",
      "https://mocmaria.com/dich-vu",
      "https://mocmaria.com/dat-lich",
      "https://mocmaria.com/tin-nhan",
      "https://mocmaria.com/tai-khoan",
    ]);
    expect(links.every((link) => !link.hasAttribute("aria-current"))).toBe(true);
  });
});
