"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiRequest, ApiError, parseApiResponse } from "../auth-api";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setError(null);
    try {
      const response = await apiRequest("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      await parseApiResponse<void>(response);
      setState("success");
    } catch (caught) {
      setState("idle");
      setError(caught instanceof ApiError ? caught.message : "Chưa thể đặt lại mật khẩu.");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl bg-[var(--moc-green-soft)] px-5 py-4 text-sm leading-6 text-[var(--moc-green-deep)]">
        Mật khẩu đã được cập nhật. Bạn có thể quay lại trang đăng nhập.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="token" className="mb-2 block text-sm font-semibold">
          Mã đặt lại mật khẩu
        </label>
        <input
          id="token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-[var(--moc-border)] bg-white px-4 outline-none"
          required
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold">
          Mật khẩu mới
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-[var(--moc-border)] bg-white px-4 outline-none"
          required
        />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={state === "saving"}
        className="min-h-12 w-full rounded-2xl bg-[var(--moc-green)] px-5 font-semibold text-white disabled:opacity-60"
      >
        {state === "saving" ? "Đang lưu..." : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}
