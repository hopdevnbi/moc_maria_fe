import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvCreateAdmin } from "./ktv-create-admin";

const mock = vi.hoisted(() => ({
  authFetch: vi.fn(),
  created: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin", roles: ["SUPER_ADMIN"], permissions: ["staff.manage"] },
    authFetch: mock.authFetch,
  }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: (path: string) =>
    path.endsWith("/capabilities")
      ? { data: { createKtv: true }, isPending: false, isError: false, refetch: vi.fn() }
      : {
          data: {
            version: 0,
            headline: "",
            biography: "",
            scheduleNote: "",
            weeklyHours: [],
            media: [],
          },
          isPending: false,
          isError: false,
          refetch: vi.fn(),
        },
  mutationMessage: () => "Không thể tạo KTV",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.authFetch.mockResolvedValue({
    userId: "user",
    providerId: "6b9f397b-f1eb-4e97-a7ee-ec22ba8c8656",
    alias: "ktv-thanh-thanh",
    username: "thanh.thanh.abcdef12@mocmaria.com",
    temporaryPassword: "Mm9-my-secure-temporary-pass",
    mustChangePassword: true,
  });
});
afterEach(cleanup);

describe("Super Admin KTV creation", () => {
  it("creates the therapist and displays one-time credentials", async () => {
    render(<KtvCreateAdmin onCreated={mock.created} />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo mới KTV" }));
    fireEvent.change(screen.getByPlaceholderText("Ví dụ: Thanh Thanh"), {
      target: { value: "Thanh Thanh" },
    });
    fireEvent.click(screen.getByLabelText("Chăm sóc giải cảm"));
    fireEvent.click(screen.getByLabelText("Massage chân"));
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản KTV" }));
    await waitFor(() => expect(mock.authFetch).toHaveBeenCalledTimes(1));
    const [path, opts] = mock.authFetch.mock.calls[0];
    expect(path).toBe("/admin/provider-display/ktv");
    expect(JSON.parse(opts.body)).toMatchObject({
      publicName: "Thanh Thanh",
      serviceIds: ["demo-pressure", "demo-neck"],
    });
    expect(mock.created).toHaveBeenCalled();
    expect(screen.getByText("thanh.thanh.abcdef12@mocmaria.com")).toBeVisible();
    expect(screen.getByText("Mm9-my-secure-temporary-pass")).toBeVisible();
    expect(screen.getByText("Ảnh & video hồ sơ")).toBeVisible();
  });
});
