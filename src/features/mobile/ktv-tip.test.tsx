import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtvTipPanel } from "./ktv-tip";

const fake = vi.hoisted(() => ({
  user: { id: "viewer", roles: ["CUSTOMER"] as string[] },
  own: { id: "provider-id" },
  authFetch: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: fake.user, authFetch: fake.authFetch }),
}));
vi.mock("@/features/marketplace/private-api", () => ({
  usePrivateData: () => ({ data: fake.own }),
  mutationMessage: (error: unknown) => (error instanceof Error ? error.message : "Có lỗi"),
}));

const publicConfig = {
  version: 1,
  bankName: "Vietcombank",
  bankAccount: "1234567890",
  accountHolder: "NGUYEN HOAN",
  qrUrl: "https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-tips/qr/provider-id/id.png",
  updatedAt: null,
};

function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderTip() {
  return render(
    <KtvTipPanel
      providerId="provider-id"
      name="Nguyễn Hoàn"
      chatHref="/tin-nhan?provider=provider-id"
    />,
  );
}

beforeEach(() => {
  fake.user = { id: "viewer", roles: ["CUSTOMER"] };
  fake.own = { id: "provider-id" };
  fake.fetch.mockReset();
  fake.authFetch.mockReset().mockResolvedValue(publicConfig);
  vi.stubGlobal("fetch", fake.fetch);
  vi.stubGlobal("crypto", {
    randomUUID: () => "11111111-1111-4111-8111-111111111111",
  });
  fake.fetch.mockImplementation((url: string) =>
    Promise.resolve(
      mockResponse(
        url.includes("/config")
          ? publicConfig
          : {
              id: "11111111-1111-4111-8111-111111111111",
              token: "22222222-2222-4222-8222-222222222222",
              amountVnd: 50_000,
              status: "INTENT",
            },
      ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("KTV appreciation flow", () => {
  it("shows a beautiful voluntary tip CTA but no edit button to customers", async () => {
    renderTip();
    expect(screen.getByRole("button", { name: /Gửi tip/ })).toBeInTheDocument();
    expect(screen.getByText(/hoàn toàn tự nguyện/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chỉnh sửa tài khoản nhận tip/ })).toBeNull();
    await waitFor(() => expect(fake.fetch).toHaveBeenCalled());
  });

  it("offers direct KTV chat when both QR and account are missing", async () => {
    fake.fetch.mockResolvedValue(
      mockResponse({
        version: 0,
        bankName: "",
        bankAccount: "",
        accountHolder: "",
        qrUrl: null,
      }),
    );
    renderTip();
    fireEvent.click(screen.getByRole("button", { name: /Gửi tip/ }));
    expect(await screen.findByText(/KTV chưa cập nhật QR hoặc số tài khoản/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chat trực tiếp với KTV/ })).toHaveAttribute(
      "href",
      "/tin-nhan?provider=provider-id",
    );
    expect(screen.getByRole("button", { name: /Xem QR & thông tin chuyển khoản/ })).toBeDisabled();
    expect(fake.fetch).toHaveBeenCalledTimes(1);
  });

  it("lets customers choose an amount, view QR/STK and report a transfer without forced receipt", async () => {
    renderTip();
    await waitFor(() => expect(fake.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Gửi tip/ }));
    fireEvent.click(screen.getByRole("button", { name: "100.000đ" }));
    fireEvent.click(screen.getByRole("button", { name: /Xem QR & thông tin chuyển khoản/ }));
    expect(await screen.findByText("1234567890")).toBeInTheDocument();
    expect(screen.getByAltText(/Mã QR nhận tip/)).toBeInTheDocument();
    const createCall = fake.fetch.mock.calls.find(([url]) => String(url).endsWith("/intents"));
    expect(JSON.parse(createCall?.[1]?.body as string).amountVnd).toBe(100_000);
    expect(screen.getByText(/QR do KTV cung cấp có thể chưa điền sẵn số tiền/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tôi đã chuyển khoản/ }));
    expect(await screen.findByText(/Cảm ơn tấm lòng của bạn/)).toBeInTheDocument();
    expect(screen.getByText(/Hoàn toàn tự nguyện. Ảnh được mã hóa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hoàn tất/ })).toBeInTheDocument();
    expect(fake.fetch.mock.calls.some(([url]) => String(url).includes("/declare"))).toBe(true);
    expect(fake.fetch.mock.calls.some(([url]) => String(url).includes("/keepsake"))).toBe(false);
  });

  it("owner KTV can configure their bank account and QR, unlike another KTV", async () => {
    fake.user = { id: "ktv", roles: ["THERAPIST"] };
    fake.own = { id: "provider-id" };
    const { rerender } = renderTip();
    const manage = screen.getByRole("button", { name: /Chỉnh sửa tài khoản nhận tip/ });
    fireEvent.click(manage);
    expect(await screen.findByRole("dialog", { name: /Tài khoản nhận tip/ })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog", { name: /Tài khoản nhận tip/ });
    expect(within(dialog).getByDisplayValue("1234567890")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByPlaceholderText(/Chỉ nhập các chữ số/), {
      target: { value: "999 123 456" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Lưu thông tin nhận tip/ }));
    await waitFor(() =>
      expect(fake.authFetch.mock.calls.some(([url]) => String(url).endsWith("/config"))).toBe(true),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /Tài khoản nhận tip/ })).toBeNull(),
    );
    fake.own = { id: "other-provider" };
    rerender(<KtvTipPanel providerId="provider-id" name="Nguyễn Hoàn" chatHref="/tin-nhan" />);
    expect(screen.queryByRole("button", { name: /Chỉnh sửa tài khoản nhận tip/ })).toBeNull();
  });

  it("SUPER_ADMIN may edit any KTV bank details", async () => {
    fake.user = { id: "admin", roles: ["SUPER_ADMIN"] };
    fake.own = { id: "another-ktv" };
    renderTip();
    expect(
      screen.getByRole("button", { name: /Chỉnh sửa tài khoản nhận tip/ }),
    ).toBeInTheDocument();
  });
});
