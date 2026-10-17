import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./admin-dashboard";

const fixtures = vi.hoisted(() => ({
  canView: true,
  invalidate: vi.fn().mockResolvedValue(undefined),
  overview: {
    generatedAt: "2026-10-17T00:00:00.000Z",
    range: {
      period: "month",
      from: "2026-09-30T17:00:00.000Z",
      to: "2026-10-31T17:00:00.000Z",
      label: "2026-10",
    },
    totals: {
      requests: 12,
      pending: 3,
      contacted: 2,
      confirmed: 1,
      inService: 1,
      completed: 5,
      cancelled: 0,
    },
    trend: [{ bucket: "2026-10-17", total: 12, completed: 5 }],
    services: [{ id: "service-1", name: "Massage trị liệu", total: 8, completed: 4 }],
    providers: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Mai Anh",
        status: "APPROVED",
        accountActive: true,
        total: 9,
        completed: 4,
        inService: 1,
        pending: 4,
        rating: 4.8,
        feedback: 2,
      },
    ],
    activeProviders: 1,
    serviceCount: 8,
  },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: fixtures.canView
      ? {
          id: "admin-1",
          displayName: "Admin",
          roles: ["SUPER_ADMIN"],
          permissions: ["customers.manage", "staff.manage"],
        }
      : { id: "reception-1", roles: ["RECEPTIONIST"], permissions: [] },
    authFetch: vi.fn(),
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: fixtures.invalidate }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[0] === "admin-dashboard"
        ? fixtures.overview
        : {
            provider: fixtures.overview.providers[0],
            feedback: [
              {
                id: "review-1",
                stars: 5,
                comment: "Dịch vụ rất tốt",
                createdAt: "2026-10-17T00:00:00Z",
              },
            ],
          },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("socket.io-client", () => ({
  io: () => ({ on: vi.fn(), disconnect: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

afterEach(() => {
  cleanup();
  fixtures.canView = true;
  fixtures.overview.providers[0].status = "APPROVED";
  fixtures.overview.providers[0].inService = 1;
  fixtures.overview.activeProviders = 1;
  fixtures.invalidate.mockClear();
});

describe("Admin operations dashboard", () => {
  it("shows real operational measures without invented revenue or online status", () => {
    render(<AdminDashboard />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Massage trị liệu")).toBeInTheDocument();
    expect(screen.getAllByText("Đang phục vụ").length).toBeGreaterThan(0);
    expect(screen.getByText(/không phải trạng thái Socket online/)).toBeInTheDocument();
    expect(screen.queryByText(/Doanh thu đã thu/)).not.toBeInTheDocument();
  });

  it("labels real unapproved applicants as awaiting review, not as suspended", () => {
    fixtures.overview.providers[0].status = "APPLIED";
    fixtures.overview.providers[0].inService = 0;
    fixtures.overview.activeProviders = 0;
    render(<AdminDashboard />);
    expect(screen.getByText("Chờ duyệt hồ sơ")).toBeInTheDocument();
    expect(screen.getByText("Hồ sơ kỹ thuật viên")).toBeInTheDocument();
    expect(screen.getByText("0 hồ sơ đã duyệt")).toBeInTheDocument();
    expect(screen.queryByText("Tạm ngưng")).not.toBeInTheDocument();
  });

  it("lazily opens a KTV drilldown with completed counts and public feedback", () => {
    render(<AdminDashboard />);
    const provider = screen.getByText("Mai Anh").closest("button");
    expect(provider).not.toBeNull();
    fireEvent.click(provider!);
    expect(screen.getByRole("dialog", { name: "Báo cáo chi tiết KTV" })).toBeInTheDocument();
    expect(screen.getByText("Dịch vụ rất tốt")).toBeInTheDocument();
  });

  it("protects analytics from users without combined permissions", () => {
    fixtures.canView = false;
    render(<AdminDashboard />);
    expect(screen.getByText(/Tổng hợp vận hành dành cho quản trị viên/)).toBeInTheDocument();
    expect(screen.queryByText("Massage trị liệu")).not.toBeInTheDocument();
  });
});
