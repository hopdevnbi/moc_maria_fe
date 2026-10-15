import { describe, expect, it } from "vitest";
import { adminVisibleGroups } from "./admin-shell";

function asUser(roles: string[], permissions: string[]) {
  return { id: "u1", email: null, displayName: "Admin", roles, permissions };
}

describe("Admin sidebar RBAC navigation", () => {
  it("shows only active management routes to SUPER_ADMIN", () => {
    const groups = adminVisibleGroups(
      asUser(["SUPER_ADMIN"], ["admin.portal", "staff.manage", "customers.manage", "roles.manage"]),
    );
    const items = groups.flatMap((group) => group.items);
    expect(items.filter((item) => item.href).map((item) => item.href)).toEqual([
      "/quan-tri",
      "/quan-tri/lich-hen",
      "/quan-tri/ktv",
      "/quan-tri/danh-gia-ktv",
      "/quan-tri/dich-vu",
      "/quan-tri/su-kien",
      "/quan-tri/co-so",
      "/quan-tri/khach-hang",
      "/quan-tri/hoi-vien-vip",
      "/quan-tri/thong-bao",
      "/quan-tri/ho-so",
      "/quan-tri/phan-quyen",
    ]);
    expect(items.filter((item) => !item.href).map((item) => item.label)).toEqual([]);
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

  it("keeps appointment administration hidden from users without customers.manage", () => {
    const groups = adminVisibleGroups(asUser(["ADMIN"], ["admin.portal", "staff.manage"]));
    expect(
      groups.flatMap((group) => group.items).some((item) => item.href === "/quan-tri/lich-hen"),
    ).toBe(false);
  });

  it("never shows role management to an ordinary ADMIN even if roles.manage is assigned", () => {
    const groups = adminVisibleGroups(asUser(["ADMIN"], ["admin.portal", "roles.manage"]));
    expect(
      groups.flatMap((group) => group.items).some((item) => item.href === "/quan-tri/phan-quyen"),
    ).toBe(false);
  });

  it("shows event gift management only to Super Admin, never ordinary operators", () => {
    const normal = adminVisibleGroups(
      asUser(["ADMIN"], ["admin.portal", "staff.manage", "customers.manage"]),
    );
    const superAdmin = adminVisibleGroups(
      asUser(["SUPER_ADMIN"], ["admin.portal", "staff.manage", "customers.manage"]),
    );
    expect(
      normal.flatMap((group) => group.items).some((item) => item.href === "/quan-tri/su-kien"),
    ).toBe(false);
    expect(
      superAdmin.flatMap((group) => group.items).some((item) => item.href === "/quan-tri/su-kien"),
    ).toBe(true);
  });

  it("shows operational modules only with staff.manage", () => {
    const groups = adminVisibleGroups(asUser(["BRANCH_MANAGER"], ["admin.portal", "staff.manage"]));
    expect(groups.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/quan-tri",
      "/quan-tri/ktv",
      "/quan-tri/danh-gia-ktv",
      "/quan-tri/dich-vu",
      "/quan-tri/co-so",
      "/quan-tri/ho-so",
    ]);
  });

  it("hides every navigation item without an authenticated user", () => {
    expect(adminVisibleGroups(null)).toEqual([]);
  });
});
