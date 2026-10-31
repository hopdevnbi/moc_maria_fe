import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

const mocks = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), replace: vi.fn() }));
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ status: "anonymous", login: mocks.login, register: mocks.register }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams("returnTo=%2Fevent"),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth form resolver compatibility", () => {
  it("shows login validation errors without requesting authentication, then submits valid input", async () => {
    const { container } = render(<LoginForm />);
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("Nhập email hoặc số điện thoại.")).toBeInTheDocument();
    expect(screen.getByText("Nhập mật khẩu.")).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Email hoặc số điện thoại"), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "ValidPass123" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        identifier: "customer@example.com",
        password: "ValidPass123",
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/event");
  });

  it("requires a contact method and keeps phone-only registration working", async () => {
    const { container } = render(<RegisterForm returnTo="/event" />);
    fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Test Customer" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "ValidPass123" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("Cần nhập email hoặc số điện thoại.")).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0900000000" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(mocks.register).toHaveBeenCalledWith({
        displayName: "Test Customer",
        phone: "0900000000",
        email: undefined,
        password: "ValidPass123",
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/event");
  });
});
