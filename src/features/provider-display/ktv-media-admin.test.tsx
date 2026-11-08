import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvMediaAdmin } from "./ktv-media-admin";

const state = vi.hoisted(() => ({
  authFetch: vi.fn(),
  refetch: vi.fn(),
}));
const id = "6b9f397b-f1eb-4e97-a7ee-ec22ba8c8656";
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ authFetch: state.authFetch, user: { id: "admin" } }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({
    data: { version: 0, headline: "", biography: "", scheduleNote: "", weeklyHours: [], media: [] },
    isPending: false,
    isError: false,
    refetch: state.refetch,
  }),
  mutationMessage: () => "Lỗi lưu media",
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.refetch.mockResolvedValue(undefined);
  state.authFetch
    .mockResolvedValueOnce({
      id: "image-uuid",
      kind: "IMAGE",
      url: "https://example.test/a.webp",
    })
    .mockResolvedValueOnce({ media: [] })
    .mockResolvedValueOnce({ avatarUrl: "https://example.test/a.webp" });
});
describe("KTV admin media uploader", () => {
  it("uses existing media API and sets the uploaded image as avatar", async () => {
    render(<KtvMediaAdmin providerId={id} />);
    fireEvent.change(screen.getByLabelText(/Chọn ảnh/), {
      target: { files: [new File(["img"], "care.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu ảnh/video" }));
    await waitFor(() => expect(state.authFetch).toHaveBeenCalledTimes(3));
    expect(state.authFetch.mock.calls[0][0]).toBe(`/provider-showcase/${id}/media`);
    expect(state.authFetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(state.authFetch.mock.calls[1][0]).toBe(`/provider-showcase/${id}`);
    expect(state.authFetch.mock.calls[2][0]).toBe(`/admin/provider-display/${id}/avatar`);
  });
});
