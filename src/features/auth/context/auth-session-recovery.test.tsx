import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthResponse } from "../auth.types";
import { RequireAuth } from "../components/RequireAuth";
import { useAuth } from "../hooks/useAuth";
import { AuthProvider } from "./AuthProvider";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  parseApiResponse: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("../auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth-api")>();
  return { ...actual, apiRequest: mocks.apiRequest, parseApiResponse: mocks.parseApiResponse };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/tai-khoan",
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("next/image", () => ({ default: () => null }));

const loggedIn: AuthResponse = {
  accessToken: "test-access-token",
  user: {
    id: "ktv-test",
    email: null,
    phone: null,
    displayName: "Test KTV",
    isActive: true,
    mustChangePassword: false,
    sessionId: "session-test",
    roles: ["THERAPIST"],
    permissions: [],
  },
};

function renderProtectedPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <ManualLogin />
        <RequireAuth>
          <div>Trang của KTV</div>
        </RequireAuth>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function ManualLogin() {
  const { login } = useAuth();
  return (
    <button
      type="button"
      onClick={() => void login({ identifier: "test@example.com", password: "test-password" })}
    >
      Đăng nhập thử
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  vi.clearAllMocks();
});

describe("session bootstrap on a new iPhone/Safari", () => {
  it("opens the protected page when refreshing the session succeeds", async () => {
    mocks.apiRequest.mockResolvedValue({ status: 200 });
    mocks.parseApiResponse.mockResolvedValue(loggedIn);
    renderProtectedPage();
    expect(await screen.findByText("Trang của KTV")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects a genuinely anonymous user after the API returns 401", async () => {
    mocks.apiRequest.mockResolvedValue({ status: 401 });
    renderProtectedPage();
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/dang-nhap?returnTo=%2Ftai-khoan"),
    );
  });

  it("does not lose a successful login to an older refresh response", async () => {
    let settleRefresh!: (response: { status: number }) => void;
    mocks.apiRequest.mockImplementation((path: string) => {
      if (path === "/auth/refresh") {
        return new Promise((resolve) => {
          settleRefresh = resolve;
        });
      }
      return Promise.resolve({ status: 200 });
    });
    mocks.parseApiResponse.mockResolvedValue(loggedIn);
    renderProtectedPage();
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập thử" }));
    expect(await screen.findByText("Trang của KTV")).toBeInTheDocument();
    await act(async () => {
      settleRefresh({ status: 401 });
    });
    expect(screen.getByText("Trang của KTV")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows retry instead of loading forever when the API hangs, then recovers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.apiRequest.mockImplementationOnce(() => new Promise(() => undefined));
    mocks.apiRequest.mockResolvedValueOnce({ status: 200 });
    mocks.parseApiResponse.mockResolvedValueOnce(loggedIn);
    renderProtectedPage();
    expect(screen.getByText("Đang mở không gian của bạn")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_100);
    });
    expect(screen.getByText("Chưa thể kiểm tra phiên đăng nhập")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Thử kết nối lại" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Trang của KTV")).toBeInTheDocument();
  });

  it("shows a recovery action after a network or CORS rejection", async () => {
    mocks.apiRequest.mockRejectedValue(new TypeError("Failed to fetch"));
    renderProtectedPage();
    expect(await screen.findByText("Chưa thể kiểm tra phiên đăng nhập")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
