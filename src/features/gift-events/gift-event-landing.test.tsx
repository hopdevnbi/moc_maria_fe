import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftEventLanding } from "./gift-event-landing";
import { eligibilityCopy, type CurrentEvent, type EventMe } from "./types";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  campaign: false,
  eligible: false,
  allTiers: false,
  authFetch: vi.fn(),
  refetch: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: mocks.authenticated ? "authenticated" : "anonymous",
    user: mocks.authenticated ? { id: "test-user", roles: ["CUSTOMER"] } : null,
    authFetch: mocks.authFetch,
    logout: mocks.logout,
  }),
}));
const event = {
  id: "1234",
  title: "Mở hộp quà An Nhiên",
  slug: "an-nhien",
  code: "an-nhien",
  description: "Lời tri ân từ Mộc Maria.",
  termsText: "Mỗi tài khoản một lượt.",
  termsVersion: 1,
  effectiveStatus: "LIVE",
  status: "LIVE",
  startAt: "2026-10-01T10:00:00Z",
  endAt: "2026-10-30T10:00:00Z",
  eligibleTiers: ["STANDARD", "VIP2"],
  budgetCapVnd: 100000,
  budgetReservedVnd: 0,
  maxOpensPerUser: 1,
  guaranteePrize: true,
  version: 1,
  heroUrl: null,
  serverNow: "2026-10-15T04:00:00Z",
} as const;

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[1] === "current"
      ? {
          data: {
            status: "ACTIVE",
            campaign: mocks.campaign
              ? {
                  ...event,
                  eligibleTiers: mocks.allTiers
                    ? ["STANDARD", ...Array.from({ length: 99 }, (_, i) => `VIP${i + 1}`)]
                    : event.eligibleTiers,
                }
              : null,
            serverNow: "2026-10-15T04:00:00Z",
          },
          dataUpdatedAt: Date.now(),
          isPending: false,
          isError: false,
          refetch: mocks.refetch,
        }
      : queryKey[1] === "me"
        ? {
            data: mocks.eligible
              ? { eventId: "1234", reason: "ELIGIBLE", canOpen: true, tier: "STANDARD" }
              : undefined,
            isPending: false,
            isError: false,
            refetch: mocks.refetch,
          }
        : { data: [], isPending: false, isError: false, refetch: mocks.refetch },
}));

beforeEach(() => {
  mocks.authenticated = false;
  mocks.campaign = false;
  mocks.eligible = false;
  mocks.allTiers = false;
  mocks.authFetch.mockReset();
  mocks.refetch.mockReset();
  mocks.logout.mockReset();
});
afterEach(() => cleanup());

describe("P09 Mộc Maria event landing", () => {
  it("links the Event logo and footer home link to the main Mộc Maria domain", () => {
    render(<GiftEventLanding />);
    expect(screen.getByRole("link", { name: "Trở về trang chủ Mộc Maria" })).toHaveAttribute(
      "href",
      "https://mocmaria.com/",
    );
    expect(screen.getByRole("link", { name: /Trang chủ/ })).toHaveAttribute(
      "href",
      "https://mocmaria.com/",
    );
  });
  it("shows event account login and registration actions to guests", () => {
    mocks.campaign = true;
    render(<GiftEventLanding />);
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/dang-nhap?returnTo=%2Fevent",
    );
    expect(screen.getByRole("link", { name: "Đăng ký" })).toHaveAttribute(
      "href",
      "/dang-ky?returnTo=%2Fevent",
    );
    expect(screen.getByRole("link", { name: /Chưa có tài khoản/ })).toBeInTheDocument();
  });
  it("offers authenticated users wallet, account management and sign-out", async () => {
    mocks.authenticated = true;
    mocks.campaign = true;
    mocks.eligible = true;
    mocks.logout.mockResolvedValue(undefined);
    render(<GiftEventLanding />);
    expect(screen.getByRole("link", { name: /Tài khoản/ })).toHaveAttribute(
      "href",
      "/tai-khoan",
    );
    expect(screen.getByRole("button", { name: /Ví quà/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất khỏi tài khoản Mộc Maria" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
  });
  it("renders public six original gift boxes while no event is published", () => {
    render(<GiftEventLanding />);
    expect(screen.getAllByRole("button", { name: /HỘP 0[1-6]/ })).toHaveLength(6);
    expect(screen.getByText("Khu vườn đang được chuẩn bị")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Đăng nhập để tham gia/ })).not.toBeInTheDocument();
  });
  it("provides real auth entry and does not invent an opening result", () => {
    mocks.campaign = true;
    render(<GiftEventLanding />);
    expect(screen.getByRole("link", { name: /Đăng nhập để tham gia/ })).toHaveAttribute(
      "href",
      "/dang-nhap?returnTo=%2Fevent",
    );
    expect(screen.queryByText("Bạn đã trúng")).not.toBeInTheDocument();
  });
  it("allows visual selection but requires agreement before sending POST open", () => {
    mocks.authenticated = true;
    mocks.campaign = true;
    mocks.eligible = true;
    render(<GiftEventLanding />);
    const gift = screen.getByRole("button", { name: /HỘP 02/ });
    fireEvent.click(gift);
    expect(gift).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Mở hộp số 2/ })).toBeDisabled();
    expect(screen.getByText(/Vui lòng đọc và đồng ý thể lệ/)).toBeInTheDocument();
  });
  it("requests reward only after explicit terms acceptance and renders server response", async () => {
    mocks.authenticated = true;
    mocks.campaign = true;
    mocks.eligible = true;
    mocks.authFetch.mockResolvedValueOnce({
      openId: "open-1",
      eventId: "1234",
      boxId: 2,
      termsVersion: 1,
      createdAt: "2026-10-15T00:00:00Z",
      reward: {
        id: "reward-1",
        prizeId: "prize-1",
        name: "Voucher massage 20%",
        description: "Áp dụng theo điều lệ",
        kind: "VOUCHER_PERCENT",
        config: { percent: 20 },
        expiresAt: "2026-11-15T00:00:00Z",
        status: "ISSUED",
      },
    });
    render(<GiftEventLanding />);
    fireEvent.click(screen.getByRole("button", { name: /HỘP 02/ }));
    const open = screen.getByRole("button", { name: /Mở hộp số 2/ });
    expect(open).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã đọc và đồng ý/ }));
    fireEvent.click(open);
    await waitFor(() =>
      expect(mocks.authFetch).toHaveBeenCalledWith(
        "/gift-events/1234/open",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const body = JSON.parse(mocks.authFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ boxId: 2, termsVersion: 1, termsAccepted: true });
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await screen.findByText("Voucher massage 20%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đã nhận quà" })).toBeDisabled();
  });
  it("summarizes full customer eligibility and keeps partial tiers explicit", () => {
    mocks.campaign = true;
    mocks.allTiers = true;
    const view = render(<GiftEventLanding />);
    expect(screen.getByText("Tất cả khách hàng đều có thể tham gia")).toBeInTheDocument();
    expect(screen.queryByText(/VIP1 · VIP2/)).not.toBeInTheDocument();
    mocks.allTiers = false;
    view.rerender(<GiftEventLanding />);
    expect(screen.getByText("THƯỜNG · VIP2")).toBeInTheDocument();
  });
  it("describes exact VIP tiers and already-played state from backend", () => {
    const campaign = { ...event, eligibleTiers: ["STANDARD", "VIP2"] } as unknown as NonNullable<
      CurrentEvent["campaign"]
    >;
    const played = { reason: "ALREADY_PLAYED" } as EventMe;
    expect(eligibilityCopy(campaign, "authenticated", played).heading).toContain("Một món quà");
    expect(
      eligibilityCopy(campaign, "authenticated", { reason: "INELIGIBLE_TIER" } as EventMe).heading,
    ).toContain("chưa đủ điều kiện");
  });
});
