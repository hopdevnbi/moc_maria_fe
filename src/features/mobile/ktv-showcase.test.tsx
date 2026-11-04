import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvShowcaseGallery } from "./ktv-showcase-gallery";
import { KtvShowcaseEditorLauncher } from "./ktv-showcase-editor";
import { EMPTY_KTV_SHOWCASE } from "./ktv-showcase-types";

const mocks = vi.hoisted(() => ({
  user: { id: "technician", roles: ["THERAPIST"] as string[] },
  own: { id: "provider-uuid" },
  authFetch: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.user,
    status: "authenticated",
    authFetch: mocks.authFetch,
  }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({ data: mocks.own }),
  mutationMessage: (error: unknown) => (error instanceof Error ? error.message : "Lỗi kết nối"),
}));

beforeEach(() => {
  mocks.user = { id: "technician", roles: ["THERAPIST"] };
  mocks.own = { id: "provider-uuid" };
  mocks.authFetch.mockReset().mockResolvedValue(EMPTY_KTV_SHOWCASE);
  mocks.refresh.mockReset();
});
afterEach(cleanup);

describe("KTV gallery", () => {
  it("does not display a broken placeholder when no media exists", () => {
    const { container } = render(<KtvShowcaseGallery media={[]} name="Nguyễn Hoàn" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("supports a mobile-friendly thumbnail selector for real images and MP4", () => {
    render(
      <KtvShowcaseGallery
        name="Nguyễn Hoàn"
        media={[
          {
            id: "a",
            kind: "IMAGE",
            url: "https://cdn.example.test/image.webp",
            caption: "Chăm sóc",
          },
          { id: "b", kind: "VIDEO", url: "https://cdn.example.test/video.mp4" },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Chăm sóc" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Video 2/ }));
    const video = screen.getByLabelText("Video giới thiệu Nguyễn Hoàn");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveProperty("muted", true);
    const next = screen.getByRole("button", { name: "Ảnh hoặc video tiếp theo" });
    expect(next.closest(".ktv-showcase-gallery-stage")).toBeNull();
    fireEvent.click(next);
    expect(screen.getByRole("img", { name: "Chăm sóc" })).toBeInTheDocument();
  });
});

describe("in-page KTV editor", () => {
  const launcher = () => (
    <KtvShowcaseEditorLauncher
      providerId="provider-uuid"
      name="Nguyễn Hoàn"
      initial={EMPTY_KTV_SHOWCASE}
    />
  );
  it("hides editor from customers and other KTVs", () => {
    mocks.user = { id: "customer", roles: ["CUSTOMER"] };
    const { rerender } = render(launcher());
    expect(screen.queryByRole("button", { name: /Tùy chỉnh trang cá nhân/ })).toBeNull();
    mocks.user = { id: "someone-else", roles: ["THERAPIST"] };
    mocks.own = { id: "other-uuid" };
    rerender(launcher());
    expect(screen.queryByRole("button", { name: /Tùy chỉnh trang cá nhân/ })).toBeNull();
  });
  it("allows the actual KTV and SUPER_ADMIN with tiny edit control", async () => {
    const { rerender } = render(launcher());
    const edit = screen.getByRole("button", { name: /Tùy chỉnh trang cá nhân/ });
    fireEvent.click(edit);
    expect(await screen.findByRole("dialog", { name: /Tùy chỉnh hồ sơ/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.authFetch).toHaveBeenCalledWith("/provider-showcase/provider-uuid/editor", {
        cache: "no-store",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Đóng chỉnh sửa" }));
    mocks.user = { id: "admin", roles: ["SUPER_ADMIN"] };
    mocks.own = { id: "other-uuid" };
    rerender(launcher());
    expect(screen.getByRole("button", { name: /Tùy chỉnh trang cá nhân/ })).toBeInTheDocument();
  });
});
