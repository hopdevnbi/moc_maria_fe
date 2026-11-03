import { describe, expect, it } from "vitest";
import {
  canUsePwaOnHost,
  detectInstallPlatform,
  hasInstalledPwa,
  isEmbeddedSocialBrowser,
  isPwaInviteSnoozed,
  mayInviteOnRoute,
} from "./pwa-install-utils";

describe("Mộc Maria PWA install policy", () => {
  it("selects instructions for modern Android, iPhone and iPad desktop UA", () => {
    expect(detectInstallPlatform("Mozilla/5.0 (Linux; Android 16) Chrome/140.0")).toBe("android");
    expect(detectInstallPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 26_0) Safari")).toBe("ios");
    expect(detectInstallPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5)).toBe("ios");
    expect(detectInstallPlatform("Mozilla/5.0 (Windows NT 10.0) Chrome/140.0")).toBe("desktop");
  });

  it("only promotes the main site, not the independent event domain", () => {
    expect(canUsePwaOnHost("mocmaria.com")).toBe(true);
    expect(canUsePwaOnHost("www.mocmaria.com")).toBe(true);
    expect(canUsePwaOnHost("localhost")).toBe(true);
    expect(canUsePwaOnHost("event.mocmaria.com")).toBe(false);
    expect(canUsePwaOnHost("mocmaria.com.evil.example")).toBe(false);
  });

  it("identifies in-app browsers that need an external browser to install", () => {
    expect(isEmbeddedSocialBrowser("Mozilla/5.0 (iPhone) FBAN/FBIOS;FBAV/500")).toBe(true);
    expect(isEmbeddedSocialBrowser("Mozilla/5.0 (Linux; Android) Zalo/25.0")).toBe(true);
    expect(isEmbeddedSocialBrowser("Mozilla/5.0 (iPhone) Instagram 370.0")).toBe(true);
    expect(isEmbeddedSocialBrowser("Mozilla/5.0 Safari")).toBe(false);
  });

  it("does not interrupt booking, chat, login, account or admin", () => {
    for (const route of ["/", "/dich-vu", "/dich-vu/goi-dau", "/chuyen-vien/linh-dan"])
      expect(mayInviteOnRoute(route)).toBe(true);
    for (const route of [
      "/dat-lich",
      "/tin-nhan",
      "/dang-nhap",
      "/quan-tri/lich-hen",
      "/tai-khoan",
      "/event",
    ])
      expect(mayInviteOnRoute(route)).toBe(false);
  });

  it("hides the invitation when already in standalone and respects postponement", () => {
    expect(hasInstalledPwa(true, undefined)).toBe(true);
    expect(hasInstalledPwa(false, true)).toBe(true);
    expect(hasInstalledPwa(false, undefined)).toBe(false);
    expect(isPwaInviteSnoozed("3000", 2000)).toBe(true);
    expect(isPwaInviteSnoozed("1000", 2000)).toBe(false);
    expect(isPwaInviteSnoozed("broken", 2000)).toBe(false);
  });
});
