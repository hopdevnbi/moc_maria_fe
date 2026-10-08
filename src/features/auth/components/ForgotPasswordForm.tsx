"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest, ApiError, parseApiResponse } from "../auth-api";

interface ForgotResponse {
  accepted: true;
  debugResetToken?: string;
}

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<ForgotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiRequest("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      setResult(await parseApiResponse<ForgotResponse>(response));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Chưa thể xử lý yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[var(--moc-green-soft)] px-5 py-4 text-sm leading-6 text-[var(--moc-green-deep)]">
          Nếu tài khoản tồn tại, Mộc Maria đã tạo yêu cầu đặt lại mật khẩu. Kênh gửi email/SMS sẽ
          được kết nối ở phase thông báo.
        </div>
        {result.debugResetToken && (
          <Link
            href={"/dat-lai-mat-khau?token=" + encodeURIComponent(result.debugResetToken)}
            className="inline-flex rounded-xl bg-[var(--moc-green)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Mở link reset dành cho môi trường local
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor="identifier" className="block text-sm font-semibold">
        Email hoặc số điện thoại
      </label>
      <input
        id="identifier"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-[var(--moc-border)] bg-white px-4 outline-none"
        required
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-2xl bg-[var(--moc-green)] px-5 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Đang xử lý..." : "Tiếp tục"}
      </button>
    </form>
  );
}
