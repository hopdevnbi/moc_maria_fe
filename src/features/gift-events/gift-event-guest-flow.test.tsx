import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { GiftEventLanding } from "./gift-event-landing";
import type { EventCampaign, EventMe, GiftOpenResult } from "./types";

const state = vi.hoisted(() => ({
  authenticated: false,
  register: vi.fn(),
  login: vi.fn(),
  authFetch: vi.fn(),
  logout: vi.fn(),
}));
const auth = {
  accessToken: "fresh-event-token",
  user: { id: "customer", roles: ["CUSTOMER"], permissions: ["customer.portal"] },
};
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    ...state,
    status: state.authenticated ? "authenticated" : "anonymous",
    user: state.authenticated ? auth.user : null,
  }),
}));
const campaign: EventCampaign = {
  id: "campaign",
  title: "Quà tri ân",
  code: "THANKS",
  slug: "thanks",
  description: "Lời cảm ơn từ Mộc",
  heroUrl: null,
  termsText: "Một lượt cho mỗi khách đủ điều kiện.",
  termsVersion: 1,
  status: "LIVE",
  effectiveStatus: "LIVE",
  startAt: "2026-11-01T00:00:00Z",
  endAt: "2026-12-01T00:00:00Z",
  serverNow: "2026-11-02T03:00:00Z",
  eligibleTiers: ["STANDARD"],
  budgetCapVnd: 100000,
  budgetReservedVnd: 0,
  guaranteePrize: true,
  maxOpensPerUser: 1,
  requiresCompletedService: false,
  version: 1,
};
const eligible: EventMe = {
  eventId: campaign.id,
  status: "LIVE",
  serverNow: campaign.serverNow,
  tier: "STANDARD",
  eligible: true,
  canOpen: true,
  reason: "ELIGIBLE",
  attemptsRemaining: 1,
  openId: null,
  rewardId: null,
};
const reward: GiftOpenResult = {
  openId: "open",
  eventId: campaign.id,
  boxId: 2,
  termsVersion: 1,
  createdAt: campaign.serverNow,
  reward: {
    id: "private-reward",
    prizeId: "prize",
    name: "Quà đã xác nhận từ máy chủ",
    description: "Theo điều kiện trong ví",
    kind: "VOUCHER_PERCENT",
    config: { percent: 20 },
    expiresAt: campaign.endAt!,
    status: "ISSUED",
  },
};
const providers = [
  {
    id: "provider",
    publicName: "Nguyệt Nguyễn",
    serviceArea: "Hà Nội",
    services: ["Massage chân"],
    avatarUrl: "https://media.example/portrait.webp",
    bookingHref: "/dat-lich?provider=nguyet-nguyen",
  },
];
const response = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
let client: QueryClient;
let latest: EventCampaign;
let eligibility: EventMe;
let openTransport: (init?: RequestInit) => Promise<Response>;
let network: MockInstance<typeof fetch>;

beforeEach(() => {
  latest = { ...campaign };
  eligibility = { ...eligible };
  state.authenticated = false;
  sessionStorage.clear();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  const authenticate = async () => {
    state.authenticated = true;
    client.clear();
    return auth;
  };
  state.register.mockReset().mockImplementation(authenticate);
  state.login.mockReset().mockImplementation(authenticate);
  state.logout.mockReset();
  state.authFetch
    .mockReset()
    .mockImplementation(async (path: string) =>
      path.endsWith("/open") ? reward : path.endsWith("/rewards") ? [] : eligibility,
    );
  openTransport = async () => response(reward);
  network = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const path = String(input);
    if (path.endsWith("/gift-events/current"))
      return response({ campaign: latest, status: "ACTIVE", serverNow: latest.serverNow });
    if (path.endsWith("/gift-events/me")) return response(eligibility);
    if (path.endsWith("/open")) return openTransport(init);
    if (path === "/api/mobile/directory") return response({ providers });
    throw new Error("Unexpected QA request " + path);
  });
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
  client.clear();
  vi.restoreAllMocks();
});
async function mountAndChoose() {
  render(
    <QueryClientProvider client={client}>
      <GiftEventLanding />
    </QueryClientProvider>,
  );
  await screen.findByText("Đăng nhập để kiểm tra lượt quà");
  fireEvent.click(screen.getByRole("button", { name: /Hộp 02 · Chuông Vàng May Mắn/ }));
  return screen.getByRole("dialog", { name: "Mở quà, đón an lành" });
}
function fill(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText("Họ và tên"), { target: { value: "Khách thử" } });
  fireEvent.change(within(dialog).getByLabelText("Số điện thoại"), {
    target: { value: "0900000000" },
  });
  fireEvent.change(within(dialog).getByLabelText("Mật khẩu", { exact: true }), {
    target: { value: "PrivatePass123" },
  });
}
const openings = () => network.mock.calls.filter(([url]) => String(url).endsWith("/open"));

describe("event guest account continuation", () => {
  it("keeps the selected box, checks the new account and opens once before offering persisted KTV booking", async () => {
    let finish!: (response: Response) => void;
    openTransport = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    const dialog = await mountAndChoose();
    expect(within(dialog).getByText("Chuông Vàng May Mắn")).toBeInTheDocument();
    fill(dialog);
    fireEvent.submit(dialog.querySelector("form")!);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(openings()).toHaveLength(1));
    expect(state.register).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(reward.reward.name)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Chọn kỹ thuật viên để đặt lịch" }),
    ).not.toBeInTheDocument();
    const eligibilityRequest = network.mock.calls.find(([url]) =>
      String(url).endsWith("/gift-events/me"),
    );
    expect(new Headers(eligibilityRequest?.[1]?.headers).get("Authorization")).toBe(
      "Bearer fresh-event-token",
    );
    const input = JSON.parse(openings()[0][1]?.body as string);
    expect(input).toMatchObject({ boxId: 2, termsVersion: 1, termsAccepted: true });
    expect(input.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Headers(openings()[0][1]?.headers).get("Authorization")).toBe(
      "Bearer fresh-event-token",
    );
    await act(async () => finish(response(reward)));
    await screen.findByRole("button", { name: "Đặt lịch chăm sóc" });
    fireEvent.click(await screen.findByRole("button", { name: "Chọn KTV Nguyệt Nguyễn" }));
    expect(screen.getByRole("link", { name: "Đặt lịch với Nguyệt Nguyễn" })).toHaveAttribute(
      "href",
      "https://mocmaria.com/dat-lich?provider=nguyet-nguyen",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(sessionStorage.length).toBe(0);
  });
  it("lets a guest opt out of terms without creating an account or consuming a turn", async () => {
    const dialog = await mountAndChoose();
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Tôi đã đọc và đồng ý/ }));
    expect(within(dialog).getByRole("button", { name: "Đăng ký & mở hộp quà" })).toBeDisabled();
    fireEvent.submit(dialog.querySelector("form")!);
    expect(state.register).not.toHaveBeenCalled();
    expect(openings()).toHaveLength(0);
  });
  it("does not open a gift if a newly registered account is ineligible", async () => {
    eligibility = { ...eligible, eligible: false, canOpen: false, reason: "INELIGIBLE_TIER" };
    const dialog = await mountAndChoose();
    fill(dialog);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("hạng được tham gia");
    expect(openings()).toHaveLength(0);
    expect(screen.queryByText(reward.reward.name)).not.toBeInTheDocument();
  });
  it("requires new consent if the terms change during signup", async () => {
    const dialog = await mountAndChoose();
    fill(dialog);
    state.register.mockImplementation(async () => {
      latest = { ...campaign, termsVersion: 2 };
      state.authenticated = true;
      client.clear();
      return auth;
    });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("Thể lệ vừa được cập nhật");
    expect(openings()).toHaveLength(0);
    expect(screen.getByRole("checkbox", { name: /Tôi đã đọc và đồng ý/ })).not.toBeChecked();
  });
  it("can log in inline after a duplicate account response and opens the same chosen box", async () => {
    state.register.mockRejectedValue(new Error("Số điện thoại đã được sử dụng."));
    const dialog = await mountAndChoose();
    fill(dialog);
    fireEvent.submit(dialog.querySelector("form")!);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("đã được sử dụng");
    expect(openings()).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Đăng nhập" }));
    expect(within(dialog).getByLabelText("Số điện thoại hoặc email")).toHaveValue("0900000000");
    fireEvent.change(within(dialog).getByLabelText("Mật khẩu", { exact: true }), {
      target: { value: "ExistingPass123" },
    });
    fireEvent.submit(dialog.querySelector("form")!);
    await screen.findByRole("button", { name: "Đặt lịch chăm sóc" });
    expect(state.login).toHaveBeenCalledTimes(1);
    expect(JSON.parse(openings()[0][1]?.body as string).boxId).toBe(2);
  });
  it("recovers an ambiguous committed open with the same payload even if eligibility now says already played", async () => {
    openTransport = async () => {
      eligibility = { ...eligible, canOpen: false, reason: "ALREADY_PLAYED" };
      throw new Error("response lost");
    };
    const dialog = await mountAndChoose();
    fill(dialog);
    fireEvent.submit(dialog.querySelector("form")!);
    const retry = await screen.findByRole("button", { name: "Tra cứu lại quà" });
    await waitFor(() => expect(retry).toBeEnabled());
    const first = JSON.parse(openings()[0][1]?.body as string);
    fireEvent.click(retry);
    await screen.findByRole("button", { name: "Đặt lịch chăm sóc" });
    const replay = state.authFetch.mock.calls.find(([path]) => path.endsWith("/open"));
    expect(JSON.parse(replay?.[1]?.body)).toEqual(first);
    expect(state.register).toHaveBeenCalledTimes(1);
  });
  it("stops opening when the event is paused while the account is being created", async () => {
    const dialog = await mountAndChoose();
    fill(dialog);
    state.register.mockImplementation(async () => {
      latest = { ...campaign, effectiveStatus: "PAUSED" };
      state.authenticated = true;
      client.clear();
      return auth;
    });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(openings()).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Sự kiện đã thay đổi hoặc tạm dừng");
  });
});
