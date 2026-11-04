import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KtvTipQr } from "./ktv-tip-qr";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onLoad,
    onError,
  }: {
    src: string;
    alt: string;
    onLoad: () => void;
    onError: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onLoad={onLoad} onError={onError} />
  ),
}));
afterEach(cleanup);

describe("tip QR recovery", () => {
  it("refreshes settings before a manual retry and displays the recovered image", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<KtvTipQr providerId="provider" version={2} name="Nguyễn Hoàn" onRefresh={refresh} />);
    const image = screen.getByAltText(/Mã QR nhận tip/);
    expect(image).toHaveAttribute("src", "/api/mobile/provider-tip-qr/provider?v=2&attempt=0");
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải mã QR");
    expect(screen.queryByRole("link", { name: "Tải mã QR" })).toBeNull();
    fireEvent.error(image);
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa tải được mã QR");
    expect(screen.queryByAltText(/Mã QR nhận tip/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tải lại mã QR/ }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const recovered = await screen.findByAltText(/Mã QR nhận tip/);
    expect(recovered).toHaveAttribute("src", "/api/mobile/provider-tip-qr/provider?v=2&attempt=1");
    fireEvent.load(recovered);
    const download = screen.getByRole("link", { name: "Tải mã QR" });
    expect(download).toHaveAttribute(
      "href",
      "/api/mobile/provider-tip-qr/provider?v=2&attempt=1&download=1",
    );
    expect(download).toHaveAttribute("download", "ktv-qr.png");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps an actionable error when refreshing configuration fails", async () => {
    render(
      <KtvTipQr
        providerId="provider"
        version={1}
        name="Nguyễn Hoàn"
        onRefresh={async () => {
          throw new Error("offline");
        }}
      />,
    );
    fireEvent.error(screen.getByAltText(/Mã QR nhận tip/));
    fireEvent.click(screen.getByRole("button", { name: /Tải lại mã QR/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Tải lại mã QR/ })).toBeEnabled(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("dùng số tài khoản bên dưới");
  });
});
