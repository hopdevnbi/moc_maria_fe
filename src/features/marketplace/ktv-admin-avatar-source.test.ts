import { describe, expect, it } from "vitest";
import { resolveAdminKtvAvatar } from "./ktv-admin-avatar-source";
import type { Application } from "./types";

const seeded = {
  id: "a",
  publicName: "Linh Anh",
  serviceArea: "Cầu Giấy · Hà Nội",
  status: "APPLIED",
} as Application;

describe("Admin KTV avatar source", () => {
  it("uses the exact same illustration as the public demo card", () => {
    expect(resolveAdminKtvAvatar(seeded)).toEqual({
      src: "/media/ktv/demo-ktv-01-care.webp",
      illustrative: true,
    });
  });
  it("prioritizes a real staff avatar over the illustrative fallback", () => {
    expect(
      resolveAdminKtvAvatar({ ...seeded, avatarUrl: "https://cdn.example.com/a.webp" }),
    ).toEqual({
      src: "https://cdn.example.com/a.webp",
      illustrative: false,
    });
  });
  it("never uses the marketing photo for a different applicant", () => {
    expect(resolveAdminKtvAvatar({ ...seeded, serviceArea: "Đống Đa · Hà Nội" })).toEqual({
      src: null,
      illustrative: false,
    });
    expect(resolveAdminKtvAvatar({ ...seeded, status: "APPROVED" })).toEqual({
      src: null,
      illustrative: false,
    });
  });
});
