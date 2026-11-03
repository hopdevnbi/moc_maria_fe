import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventSupport } from "./event-support";

vi.mock("next/link", () => ({
  default: ({ onClick, ...props }: React.ComponentProps<"a">) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  ),
}));

const mocks = vi.hoisted(() => ({
  providers: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      publicName: "KTV Nguyệt",
      title: "Chăm sóc trị liệu",
      serviceArea: "Đan Phương",
      avatarUrl: null,
      services: [],
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      publicName: "KTV Huyền",
      title: "Massage thư giãn",
      serviceArea: "Tân Tây Đô",
      avatarUrl: null,
      services: [],
    },
  ],
  error: false,
  seed: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.seed }),
  useQuery: ({ enabled }: { enabled: boolean }) => ({
    data: enabled && !mocks.error ? mocks.providers : undefined,
    isPending: !enabled,
    isError: enabled && mocks.error,
    isSuccess: enabled && !mocks.error,
  }),
}));

const authFetch = vi.fn();
const customer = { id: "customer-1", permissions: ["customer.portal"] };
afterEach(() => {
  cleanup();
  mocks.error = false;
  mocks.seed.mockClear();
  vi.restoreAllMocks();
});

describe("Mộc Maria event floating support", () => {
  it("is fixed launcher and requires account before support chat", () => {
    render(<EventSupport status="anonymous" user={null} authFetch={authFetch} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở hỗ trợ online" }));
    expect(screen.getByRole("dialog", { name: /Mộc luôn sẵn lòng lắng nghe/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Đăng nhập/ })).toHaveAttribute(
      "href",
      "/dang-nhap?returnTo=%2Ftin-nhan",
    );
    expect(screen.getByRole("link", { name: /Đăng ký nhanh/ })).toHaveAttribute(
      "href",
      "/dang-ky?returnTo=%2Ftin-nhan",
    );
    expect(screen.queryByRole("link", { name: /Nhắn tin với/ })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows signed-in customers to filter and chat with their chosen real KTV", () => {
    render(<EventSupport status="authenticated" user={customer} authFetch={authFetch} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở hỗ trợ online" }));
    expect(screen.getByRole("link", { name: "Nhắn tin với KTV Nguyệt" })).toHaveAttribute(
      "href",
      "/tin-nhan?provider=11111111-1111-4111-8111-111111111111",
    );
    expect(screen.getByRole("link", { name: "Nhắn tin với KTV Huyền" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kỹ thuật viên" }), {
      target: { value: "Nguyệt" },
    });
    expect(screen.getByRole("link", { name: "Nhắn tin với KTV Nguyệt" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nhắn tin với KTV Huyền" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Nhắn tin với KTV Nguyệt" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.seed).toHaveBeenCalledWith(
      ["ktv-chat", customer.id, "providers"],
      mocks.providers,
    );
  });

  it("offers safe fallback if directory cannot load", () => {
    mocks.error = true;
    render(<EventSupport status="authenticated" user={customer} authFetch={authFetch} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở hỗ trợ online" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa tải được KTV");
    expect(screen.getByRole("link", { name: /Xem các cuộc trò chuyện/ })).toHaveAttribute(
      "href",
      "/tin-nhan",
    );
  });

  it("never offers a KTV picker to staff accounts without customer chat capability", () => {
    render(
      <EventSupport
        status="authenticated"
        user={{ id: "staff", permissions: ["provider.portal"] }}
        authFetch={authFetch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mở hỗ trợ online" }));
    expect(screen.getByText("Tin nhắn của khách hàng")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nhắn tin với/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /Mở hộp thư khách hàng/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("finds Vietnamese names without accents, closes outside and restores focus on Escape", () => {
    render(<EventSupport status="authenticated" user={customer} authFetch={authFetch} />);
    const launcher = screen.getByRole("button", { name: "Mở hỗ trợ online" });
    fireEvent.click(launcher);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kỹ thuật viên" }), {
      target: { value: "nguyet" },
    });
    expect(screen.getByRole("link", { name: "Nhắn tin với KTV Nguyệt" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nhắn tin với KTV Huyền" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(launcher).toHaveFocus();
    fireEvent.click(launcher);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
