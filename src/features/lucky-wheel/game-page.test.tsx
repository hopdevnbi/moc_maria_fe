import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/features/auth/auth-api";
import { GamePage } from "./game-page";
import { accountWheelTransport } from "./wheel-transport";
const auth = vi.hoisted(() => ({
  status: "anonymous",
  user: null as null | { id: string; sessionId: string; mustChangePassword: boolean },
  authFetch: vi.fn(),
  retrySession: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("./guest-lucky-wheel", () => ({ GuestLuckyWheel: () => <div>Guest-local-engine</div> }));
vi.mock("./wheel-game", () => ({ WheelGame: () => <div>Account-wallet-engine</div> }));
afterEach(() => {
  cleanup();
  auth.status = "anonymous";
  auth.user = null;
  vi.clearAllMocks();
});
describe("Mộc game mode and authentication boundary", () => {
  it("keeps the public route free without invoking account transport", () => {
    render(<GamePage />);
    expect(screen.getByText("Guest-local-engine")).toBeInTheDocument();
    expect(auth.authFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Dùng coin tài khoản" })).toHaveAttribute(
      "href",
      "/tro-choi/tai-khoan",
    );
  });
  it("offers login and practice before permitting account coins", () => {
    render(<GamePage account />);
    expect(screen.queryByText("Account-wallet-engine")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/dang-nhap?returnTo=%2Ftro-choi%2Ftai-khoan",
    );
  });
  it("blocks password-change accounts and unmounts the wallet game after logout", () => {
    auth.status = "authenticated";
    auth.user = { id: "user-a", sessionId: "session-a", mustChangePassword: true };
    const view = render(<GamePage account />);
    expect(screen.queryByText("Account-wallet-engine")).not.toBeInTheDocument();
    auth.user.mustChangePassword = false;
    view.rerender(<GamePage account />);
    expect(screen.getByText("Account-wallet-engine")).toBeInTheDocument();
    auth.user = null;
    auth.status = "anonymous";
    view.rerender(<GamePage account />);
    expect(screen.queryByText("Account-wallet-engine")).not.toBeInTheDocument();
  });
  it("uses refresh-aware Mộc transport, preserves request identity and stable rejection codes", async () => {
    const transport = accountWheelTransport(auth.authFetch);
    const signal = new AbortController().signal;
    const input = {
      roundId: "round",
      requestId: "same-request",
      color: "GREEN" as const,
      stake: 5,
    };
    auth.authFetch.mockRejectedValueOnce(new ApiError(409, "WHEEL_INSUFFICIENT_COINS"));
    const response = await transport.place(input, signal);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "WHEEL_INSUFFICIENT_COINS" });
    expect(auth.authFetch).toHaveBeenCalledWith(
      "/games/wheel/bets",
      expect.objectContaining({ signal, body: JSON.stringify(input), cache: "no-store" }),
    );
  });
});
