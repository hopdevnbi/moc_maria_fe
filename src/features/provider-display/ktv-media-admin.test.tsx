import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvMediaAdmin } from "./ktv-media-admin";

const state = vi.hoisted(() => ({
  authFetch: vi.fn(),
  refetch: vi.fn(),
  showcase: {
    version: 0,
    headline: "",
    biography: "",
    scheduleNote: "",
    weeklyHours: [],
    media: [] as Array<{ id: string; kind: "IMAGE" | "VIDEO"; url: string; caption: string }>,
  },
}));
const id = "6b9f397b-f1eb-4e97-a7ee-ec22ba8c8656";
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ authFetch: state.authFetch, user: { id: "admin" } }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({
    data: state.showcase,
    isPending: false,
    isError: false,
    refetch: state.refetch,
  }),
  mutationMessage: () => "Lỗi lưu media",
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.showcase.media = [];
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
    fireEvent.change(screen.getByLabelText("Thêm ảnh vào thư viện"), {
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
  it("displays the current avatar and can select an existing gallery photo without uploading again", async () => {
    const first = {
      id: "image-1",
      kind: "IMAGE" as const,
      url: "https://example.test/first.webp",
      caption: "",
    };
    const second = {
      id: "image-2",
      kind: "IMAGE" as const,
      url: "https://example.test/second.webp",
      caption: "",
    };
    state.showcase.media = [first, second];
    const changed = vi.fn();
    state.authFetch.mockReset().mockResolvedValue({ avatarUrl: second.url });
    render(
      <KtvMediaAdmin
        providerId={id}
        providerName="Thanh Thanh"
        currentAvatarUrl={first.url}
        onAvatarChanged={changed}
      />,
    );
    expect(screen.getByAltText("Ảnh đại diện hiện tại của Thanh Thanh")).toHaveAttribute(
      "src",
      first.url,
    );
    expect(screen.getByAltText("Ảnh thư viện KTV 2")).toHaveAttribute("src", second.url);
    expect(screen.getByRole("button", { name: "Đặt ảnh 1 làm đại diện" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Đặt ảnh 2 làm đại diện" }));
    await waitFor(() => expect(changed).toHaveBeenCalledWith(second.url));
    expect(screen.getByAltText("Ảnh đại diện hiện tại của Thanh Thanh")).toHaveAttribute(
      "src",
      second.url,
    );
    expect(state.authFetch).toHaveBeenCalledTimes(1);
    expect(state.authFetch.mock.calls[0][0]).toBe(`/admin/provider-display/${id}/avatar`);
    expect(JSON.parse(state.authFetch.mock.calls[0][1].body)).toEqual({ mediaId: second.id });
  });
  it("uploads a dedicated avatar alongside gallery images and prefers it over the previous avatar", async () => {
    const changed = vi.fn();
    const photo = {
      id: "avatar-image",
      kind: "IMAGE" as const,
      url: "https://example.test/avatar.webp",
      caption: "",
    };
    const gallery = {
      id: "gallery-image",
      kind: "IMAGE" as const,
      url: "https://example.test/gallery.webp",
      caption: "",
    };
    state.authFetch
      .mockReset()
      .mockResolvedValueOnce(photo)
      .mockResolvedValueOnce(gallery)
      .mockResolvedValueOnce({ media: [photo, gallery] })
      .mockResolvedValueOnce({ avatarUrl: photo.url });
    render(
      <KtvMediaAdmin
        providerId={id}
        providerName="Thanh Thanh"
        currentAvatarUrl="https://example.test/old.webp"
        onAvatarChanged={changed}
      />,
    );
    fireEvent.change(screen.getByLabelText("Upload ảnh đại diện mới"), {
      target: { files: [new File(["avatar"], "thanh.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.change(screen.getByLabelText("Thêm ảnh vào thư viện"), {
      target: { files: [new File(["gallery"], "care.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu ảnh/video" }));
    await waitFor(() => expect(state.authFetch).toHaveBeenCalledTimes(4));
    expect(state.authFetch.mock.calls[0][0]).toBe(`/provider-showcase/${id}/media`);
    expect(state.authFetch.mock.calls[1][0]).toBe(`/provider-showcase/${id}/media`);
    const saved = JSON.parse(state.authFetch.mock.calls[2][1].body);
    expect(saved.media).toEqual([photo, gallery]);
    expect(JSON.parse(state.authFetch.mock.calls[3][1].body)).toEqual({ mediaId: photo.id });
    expect(changed).toHaveBeenCalledWith(photo.url);
    expect(screen.getByAltText("Ảnh đại diện hiện tại của Thanh Thanh")).toHaveAttribute(
      "src",
      photo.url,
    );
  });
  it("rejects image upload without public-media consent", async () => {
    state.authFetch.mockReset();
    render(<KtvMediaAdmin providerId={id} />);
    fireEvent.change(screen.getByLabelText("Upload ảnh đại diện mới"), {
      target: { files: [new File(["avatar"], "thanh.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ảnh/video" }));
    expect(screen.getByRole("alert")).toHaveTextContent("xác nhận quyền sử dụng");
    expect(state.authFetch).not.toHaveBeenCalled();
  });
});
