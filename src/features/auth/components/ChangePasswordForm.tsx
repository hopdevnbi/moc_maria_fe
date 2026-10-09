"use client";

import { useState } from "react";
import { ApiError } from "../auth-api";
import { useAuth } from "../hooks/useAuth";

export function ChangePasswordForm() {
  const { authFetch } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setError(null);
    try {
      await authFetch<void>("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setState("success");
    } catch (caught) {
      setState("idle");
      setError(caught instanceof ApiError ? caught.message : "Chưa thể đổi mật khẩu.");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-[1.5rem] border border-[var(--moc-border)] bg-white/70 p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-[var(--moc-green-deep)]">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-[var(--moc-muted)]">
          Mật khẩu mới cần ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.
        </p>
      </div>
      <input
        type="password"
        aria-label="Mật khẩu hiện tại"
        required
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="Mật khẩu hiện tại"
        className="min-h-11 w-full rounded-xl border border-[var(--moc-border)] bg-white px-4 outline-none"
      />
      <input
        type="password"
        aria-label="Mật khẩu mới"
        required
        minLength={10}
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder="Mật khẩu mới"
        className="min-h-11 w-full rounded-xl border border-[var(--moc-border)] bg-white px-4 outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {state === "success" && (
        <p role="status" className="text-sm text-emerald-700">
          Đã cập nhật mật khẩu.
        </p>
      )}
      <button
        type="submit"
        disabled={state === "saving"}
        className="rounded-xl bg-[var(--moc-green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state === "saving" ? "Đang lưu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
