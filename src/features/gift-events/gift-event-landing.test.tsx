import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftEventLanding } from "./gift-event-landing";
import { eligibilityCopy, type CurrentEvent, type EventMe } from "./types";

const mocks = vi.hoisted(() => ({ authenticated: false, campaign: false, eligible: false }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    status: mocks.authenticated ? "authenticated" : "anonymous",
    user: mocks.authenticated ? { id: "test-user", roles: ["CUSTOMER"] } : null,
    authFetch: vi.fn(),
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
            campaign: mocks.campaign ? event : null,
            serverNow: "2026-10-15T04:00:00Z",
          },
          dataUpdatedAt: Date.now(),
          isPending: false,
          isError: false,
        }
      : queryKey[1] === "me"
        ? {
            data: mocks.eligible
              ? { eventId: "1234", reason: "ELIGIBLE", canOpen: true, tier: "STANDARD" }
              : undefined,
            isPending: false,
            isError: false,
          }
        : { data: [], isPending: false, isError: false },
}));

beforeEach(() => {
  mocks.authenticated = false;
  mocks.campaign = false;
  mocks.eligible = false;
});
afterEach(() => cleanup());

describe("P09 Mộc Maria event landing", () => {
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
  it("allows visual selection but never performs POST open before P10", () => {
    mocks.authenticated = true;
    mocks.campaign = true;
    mocks.eligible = true;
    render(<GiftEventLanding />);
    const gift = screen.getByRole("button", { name: /HỘP 02/ });
    fireEvent.click(gift);
    expect(gift).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Đã chọn hộp số 2/ })).toBeDisabled();
    expect(screen.getByText(/Chưa phát quà/)).toBeInTheDocument();
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
