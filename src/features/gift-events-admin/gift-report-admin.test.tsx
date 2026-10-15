import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GiftReportAdmin } from "./gift-report-admin";

const mock = vi.hoisted(() => ({ role: "ADMIN", queries: [] as boolean[] }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test", roles: [mock.role] }, accessToken: "fake-token" }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: (_path: string, enabled: boolean) => {
    mock.queries.push(enabled);
    return { data: undefined, isError: false, isPending: false };
  },
}));
afterEach(() => {
  cleanup();
  mock.queries = [];
  mock.role = "ADMIN";
});
describe("P15 Event report confidentiality", () => {
  it("does not activate private queries for ordinary Admin", () => {
    render(<GiftReportAdmin />);
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ Super Admin");
    expect(mock.queries.every((flag) => flag === false)).toBe(true);
    expect(screen.queryByText("Xuất CSV đối soát")).not.toBeInTheDocument();
  });
  it("allows Super Admin to select a report", () => {
    mock.role = "SUPER_ADMIN";
    render(<GiftReportAdmin />);
    expect(screen.getByRole("heading", { name: "Đối soát quà tặng" })).toBeInTheDocument();
    expect(mock.queries).toContain(true);
  });
});
