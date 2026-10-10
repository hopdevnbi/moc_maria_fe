import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatPrivacyControls } from "./chat-privacy";

const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ authFetch: state.fetch }) }));
beforeEach(() => state.fetch.mockReset());
afterEach(() => cleanup());

it("confirms the new password locally before sending and clears the dialog on success", async () => {
  const onState = vi.fn();
  state.fetch.mockResolvedValue({
    id: "a",
    privacy_enabled: true,
    history_locked: false,
    unlock_token: "temporary",
  });
  render(<ChatPrivacyControls thread={{ id: "a" }} onState={onState} onConceal={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Đặt mật khẩu chat" }));
  fireEvent.change(screen.getByLabelText("Mật khẩu chat mới", { exact: true }), {
    target: { value: "private pass" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu chat mới"), {
    target: { value: "does not match" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu mật khẩu chat" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("chưa khớp");
  expect(state.fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu chat mới"), {
    target: { value: "private pass" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu mật khẩu chat" }));
  await waitFor(() => expect(onState).toHaveBeenCalled());
  expect(JSON.parse(state.fetch.mock.calls[0][1].body)).toEqual({ password: "private pass" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("requires the current chat password when changing it", async () => {
  state.fetch.mockResolvedValue({
    id: "a",
    privacy_enabled: true,
    history_locked: false,
    unlock_token: "new proof",
  });
  render(
    <ChatPrivacyControls
      thread={{ id: "a", privacy_enabled: true }}
      onState={vi.fn()}
      onConceal={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Mật khẩu chat" }));
  fireEvent.change(screen.getByLabelText("Mật khẩu chat hiện tại"), {
    target: { value: "old private pass" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu chat mới", { exact: true }), {
    target: { value: "new private pass" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu chat mới"), {
    target: { value: "new private pass" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu mật khẩu chat" }));
  await waitFor(() => expect(state.fetch).toHaveBeenCalled());
  expect(JSON.parse(state.fetch.mock.calls[0][1].body)).toEqual({
    password: "new private pass",
    currentPassword: "old private pass",
  });
});

it("shows wrong-password feedback and offers recovery using the account password", async () => {
  const onState = vi.fn();
  state.fetch
    .mockRejectedValueOnce(new Error("Mật khẩu chưa đúng."))
    .mockResolvedValueOnce({ id: "a", privacy_enabled: false, history_locked: false });
  render(
    <ChatPrivacyControls
      thread={{ id: "a", privacy_enabled: true, history_locked: true }}
      onState={onState}
      onConceal={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Mật khẩu chat", { exact: true }), {
    target: { value: "wrong pass" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Mở khóa hội thoại" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Mật khẩu chưa đúng");
  fireEvent.click(screen.getByRole("button", { name: "Quên mật khẩu chat?" }));
  expect(screen.getByLabelText("Mật khẩu tài khoản")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Mật khẩu tài khoản"), {
    target: { value: "own account pass" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận bỏ khóa" }));
  await waitFor(() =>
    expect(onState).toHaveBeenCalledWith({
      id: "a",
      privacy_enabled: false,
      history_locked: false,
    }),
  );
  expect(state.fetch.mock.calls[1][0]).toBe("/ktv-chat/threads/a/privacy/recover");
  expect(JSON.parse(state.fetch.mock.calls[1][1].body)).toEqual({ password: "own account pass" });
});
