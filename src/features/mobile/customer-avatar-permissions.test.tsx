import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerPhoto, type CustomerSelfProfile } from "./customer-account-profile";
const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ authFetch: state.fetch }) }));
vi.mock("next/image", () => ({ default: () => null }));
const profile: CustomerSelfProfile = {
  id: "me",
  displayName: "Hợp",
  email: null,
  phone: null,
  roles: ["CUSTOMER"],
  avatarUploadEnabled: true,
  customer: { id: "customer", birthday: null, avatarUrl: null },
  membership: { tier: "VIP", level: 3, expiresAt: null, startedAt: null },
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  state.fetch.mockResolvedValue({
    ...profile,
    customer: { ...profile.customer, avatarUrl: "https://cdn.example.test/avatar.webp" },
  });
});
describe("Customer avatar controls", () => {
  it("allows every active customer, including standard and expired VIP customers, to choose an avatar", () => {
    const view = render(
      <CustomerPhoto
        profile={{ ...profile, membership: { ...profile.membership, tier: "STANDARD" } }}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Thay ảnh đại diện")).toBeInTheDocument();
    view.rerender(
      <CustomerPhoto
        profile={{
          ...profile,
          membership: { ...profile.membership, expiresAt: "2020-01-01T00:00:00Z" },
        }}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Thay ảnh đại diện")).toBeInTheDocument();
  });
  it("does not offer a broken upload button if CDN upload is not configured", () => {
    render(
      <CustomerPhoto profile={{ ...profile, avatarUploadEnabled: false }} onUpdate={vi.fn()} />,
    );
    expect(screen.queryByLabelText("Thay ảnh đại diện")).not.toBeInTheDocument();
    expect(screen.getByText(/Tính năng tải ảnh đang tạm bảo trì/)).toBeInTheDocument();
  });
  it("lets active VIP preview, explicitly save a file and refresh the displayed profile", async () => {
    const update = vi.fn();
    render(<CustomerPhoto profile={profile} onUpdate={update} />);
    const file = new File(["test image"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Thay ảnh đại diện"), { target: { files: [file] } });
    expect(state.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu ảnh" }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(state.fetch.mock.calls[0][0]).toBe("/customers/me/avatar");
    expect((state.fetch.mock.calls[0][1].body as FormData).get("file")).toBe(file);
    expect(screen.getByText("Đã cập nhật ảnh đại diện.")).toBeVisible();
  });
});
