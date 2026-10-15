import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletQr, canGenerateGiftQr } from "./wallet-qr";
import type { WalletGift } from "./types";
const gift: WalletGift = {
  id: "1234",
  openId: "open1",
  eventId: "event1",
  prizeId: "p1",
  name: "Voucher chăm sóc",
  description: "Tri ân",
  kind: "VOUCHER_FIXED",
  config: { valueVnd: 50000 },
  allowedBranchIds: ["b1"],
  status: "ISSUED",
  expiresAt: "2099-12-31T00:00:00.000Z",
  issuedAt: "2026-10-15T00:00:00.000Z",
  redeemedAt: null,
  redeemedBranchId: null,
};
afterEach(() => cleanup());
describe("P11 private QR wallet", () => {
  it("blocks expired, redeemed and voided prizes", () => {
    expect(canGenerateGiftQr(gift, Date.now())).toBe(true);
    for (const status of ["EXPIRED", "REDEEMED", "VOIDED"] as const) {
      expect(canGenerateGiftQr({ ...gift, status }, Date.now())).toBe(false);
    }
  });
  it("does not issue QR for redeemed rewards", () => {
    const fetch = vi.fn();
    render(<WalletQr gift={{ ...gift, status: "REDEEMED" }} authFetch={fetch} />);
    expect(screen.queryByRole("button", { name: /Tạo mã QR/ })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires explicit interaction, never places token in location", async () => {
    const fetch = vi.fn().mockResolvedValue({
      token: "secret-one-time-opaque-token",
      rewardId: gift.id,
      expiresAt: new Date(Date.now() + 240000).toISOString(),
    });
    render(<WalletQr gift={gift} authFetch={fetch} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Tạo mã QR/ }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/gift-events/me/rewards/1234/qr", {
        method: "POST",
        cache: "no-store",
      }),
    );
    expect(location.href).not.toContain("secret-one-time");
  });
});
