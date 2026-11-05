import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttendanceAdminWorkspace } from "./attendance-admin-workspace";

vi.mock("./staff-attendance-admin", () => ({
  StaffAttendanceAdmin: () => <div>Danh sách điểm danh</div>,
}));
vi.mock("@/features/safety/admin-safety", () => ({
  AdminSafety: () => <div>Bản đồ theo dõi Super Admin</div>,
}));
afterEach(cleanup);

describe("Super Admin attendance workspace", () => {
  it("keeps check-in as the default and makes KTV tracking available on the same screen", () => {
    render(<AttendanceAdminWorkspace />);
    expect(screen.getByText("Danh sách điểm danh")).toBeInTheDocument();
    expect(screen.queryByText("Bản đồ theo dõi Super Admin")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Định vị & hành trình KTV/ }));
    expect(screen.getByText("Bản đồ theo dõi Super Admin")).toBeInTheDocument();
    expect(screen.queryByText("Danh sách điểm danh")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Chấm công & coin/ }));
    expect(screen.getByText("Danh sách điểm danh")).toBeInTheDocument();
  });
});
