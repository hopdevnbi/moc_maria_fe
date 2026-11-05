import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAttendanceAdmin } from "./staff-attendance-admin";
import { hcmDate, type AttendanceRecord } from "./data";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), roles: ["SUPER_ADMIN"] as string[] }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", roles: mocks.roles },
    authFetch: mocks.fetch,
  }),
}));

const withPhoto: AttendanceRecord = {
  id: "checkin-1",
  userId: "user-1",
  branchId: "branch-1",
  localDate: hcmDate(),
  status: "IN_RANGE",
  coinsEarned: 5,
  distanceMeters: 83,
  accuracyMeters: 14,
  employee: { displayName: "Nguyệt Nguyễn", email: "nguyet@example.test" },
  selfieUrl:
    "https://giangxa-media-cdn.b-cdn.net/moc-maria/staff-attendance/2026-11-05/1/selfie.webp",
};
const withoutPhoto: AttendanceRecord = {
  id: "checkin-2",
  userId: "user-2",
  branchId: "branch-1",
  localDate: hcmDate(),
  status: "LOCATION_UNAVAILABLE",
  coinsEarned: 0,
  staff: { displayName: "Hoàng Anh", email: "ha@example.test" },
};
let records: AttendanceRecord[];

function draw() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StaffAttendanceAdmin />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.roles = ["SUPER_ADMIN"];
  records = [withPhoto, withoutPhoto];
  mocks.fetch.mockReset().mockImplementation(async (path: string, options?: RequestInit) => {
    if (options?.method === "DELETE") {
      records = records.filter((r) => !path.endsWith(r.id));
      return { deleted: true };
    }
    if (path.includes("/staff-attendance/check-ins?"))
      return { items: records, total: records.length };
    if (path.includes("/staff-attendance/summary?"))
      return {
        totalCheckIns: 2,
        totalCoinsAwarded: 5,
        statuses: { IN_RANGE: 1, LOCATION_UNAVAILABLE: 1 },
      };
    if (path.includes("/admin/branches"))
      return [{ id: "branch-1", name: "Mộc Maria", latitude: 21, longitude: 105 }];
    throw new Error("Unexpected request " + path);
  });
});
afterEach(() => cleanup());

describe("Super Admin attendance list UX", () => {
  it("requires confirmation before deleting just one check-in and refreshes the list", async () => {
    draw();
    await screen.findByText("Nguyệt Nguyễn");
    fireEvent.click(screen.getByRole("button", { name: "Xóa lượt check-in của Nguyệt Nguyễn" }));
    const dialog = screen.getByRole("alertdialog", { name: "Xóa lượt điểm danh?" });
    expect(within(dialog).getByText(/hoàn tác/)).toBeInTheDocument();
    expect(
      mocks.fetch.mock.calls.filter(([, options]) => options?.method === "DELETE"),
    ).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Quay lại" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa lượt check-in của Nguyệt Nguyễn" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xác nhận xóa" }),
    );
    await waitFor(() => expect(screen.queryByText("Nguyệt Nguyễn")).not.toBeInTheDocument());
    expect(screen.getByText("Hoàng Anh")).toBeInTheDocument();
    expect(mocks.fetch.mock.calls.filter(([, options]) => options?.method === "DELETE")).toEqual([
      [
        "/admin/staff-attendance/check-ins/checkin-1",
        expect.objectContaining({ method: "DELETE" }),
      ],
    ]);
    expect(screen.getByText(/Đã xóa lượt check-in của Nguyệt Nguyễn/)).toBeInTheDocument();
  });

  it("keeps the original check-in and reports errors when delete is rejected", async () => {
    mocks.fetch.mockImplementation(async (path: string, options?: RequestInit) => {
      if (options?.method === "DELETE") throw new Error("Số dư coin không đủ hoàn tác.");
      if (path.includes("/staff-attendance/check-ins?")) return { items: records, total: 2 };
      if (path.includes("/staff-attendance/summary?"))
        return { total: 2, statuses: { IN_RANGE: 1, LOCATION_UNAVAILABLE: 1 } };
      if (path.includes("/admin/branches"))
        return [{ id: "branch-1", name: "Mộc Maria", latitude: 21, longitude: 105 }];
      throw new Error("Unexpected request");
    });
    draw();
    await screen.findByText("Nguyệt Nguyễn");
    fireEvent.click(screen.getByRole("button", { name: "Xóa lượt check-in của Nguyệt Nguyễn" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xác nhận xóa" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Số dư coin không đủ hoàn tác");
    expect(screen.getAllByText("Nguyệt Nguyễn").length).toBeGreaterThan(0);
  });
  it("renders clear staff cards, GPS, coins and a selfie link rather than inline admin images", async () => {
    draw();
    const employee = await screen.findByText("Nguyệt Nguyễn");
    const card = employee.closest("article")!;
    expect(within(card).getByText("83 m")).toBeInTheDocument();
    expect(within(card).getByText("+5 coin")).toBeInTheDocument();
    expect(within(card).getByText("Đủ điều kiện 200m")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Xem ảnh selfie" })).toHaveAttribute(
      "href",
      withPhoto.selfieUrl,
    );
    expect(card.querySelector("img")).toBeNull();
    expect(screen.getByText("Hoàng Anh")).toBeInTheDocument();
    expect(screen.getByText("Chưa gửi selfie")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chấm công & ví coin" })).toBeInTheDocument();
  });

  it("filters locally within the page and keeps date selection, status and pagination controls", async () => {
    draw();
    await screen.findByText("Nguyệt Nguyễn");
    fireEvent.change(screen.getByRole("combobox", { name: "Lọc trạng thái điểm danh" }), {
      target: { value: "LOCATION_UNAVAILABLE" },
    });
    expect(screen.queryByText("Nguyệt Nguyễn")).not.toBeInTheDocument();
    expect(screen.getByText("Hoàng Anh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trước/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Sau/ })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Lọc trạng thái điểm danh" }), {
      target: { value: "ALL" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Tìm nhân viên" }), {
      target: { value: "Nguyệt" },
    });
    await waitFor(() => expect(screen.queryByText("Hoàng Anh")).not.toBeInTheDocument());
  });

  it("does not expose the admin list to staff roles", () => {
    mocks.roles = ["THERAPIST"];
    draw();
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ super admin");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
