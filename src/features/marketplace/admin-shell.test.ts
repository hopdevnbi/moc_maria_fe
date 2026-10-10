import { describe, expect, it } from "vitest";
import { adminVisibleGroups } from "./admin-shell";

function asUser(roles: string[], permissions: string[]) {
  return { id: "u1", email: null, displayName: "Admin", roles, permissions };
}

describe("Admin sidebar RBAC navigation", () => {
  it("shows only active management routes to SUPER_ADMIN", () => {
    const groups = adminVisibleGroups(
      asUser(["SUPER_ADMIN"], ["admin.portal", "staff.manage", "customers.manage"]),
    );
    const items = groups.flatMap((group) => group.items);
    expect(items.filter((item) => item.href).map((item) => item.href)).toEqual([
      "/quan-tri",
      "/quan-tri/ktv",
      "/quan-tri/dich-vu",
      "/quan-tri/co-so",
      "/quan-tri/ho-so",
    ]);
    expect(items.filter((item) => !item.href).map((item) => item.label)).toEqual([
      "Khách hàng",
      "Hội viên VIP",
      "Phân quyền & cấu hình",
    ]);
  });

  it("does not show VIP approval access to a receptionist with customers.manage", () => {
    const groups = adminVisibleGroups(
      asUser(["RECEPTIONIST"], ["admin.portal", "customers.manage"]),
    );
    expect(groups.flatMap((group) => group.items).map((item) => item.label)).toEqual([
      "Tổng quan",
      "Hồ sơ cá nhân",
    ]);
  });

  it("shows operational modules only with staff.manage", () => {
    const groups = adminVisibleGroups(asUser(["BRANCH_MANAGER"], ["admin.portal", "staff.manage"]));
    expect(groups.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/quan-tri",
      "/quan-tri/ktv",
      "/quan-tri/dich-vu",
      "/quan-tri/co-so",
      "/quan-tri/ho-so",
    ]);
  });

  it("hides every navigation item without an authenticated user", () => {
    expect(adminVisibleGroups(null)).toEqual([]);
  });
});
