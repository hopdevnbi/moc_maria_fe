"use client";
import { PendingLabel } from "@/shared/loading/loading-state";

import { useState } from "react";
import { useLocale } from "@/shared/i18n/locale-provider";
import { useAuth } from "../hooks/useAuth";

export function ChangePasswordForm() {
  const { authFetch } = useAuth();
  const { t, locale } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "success">("idle");
  const [error, setError] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setError(false);
    try {
      await authFetch<void>("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setState("success");
    } catch {
      setState("idle");
      setError(true);
    }
  }

  return (
    <form
      onSubmit={submit}
      lang={locale}
      className="space-y-4 rounded-[1.5rem] border border-[var(--moc-border)] bg-white/70 p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-[var(--moc-green-deep)]">{t("cp.password")}</h2>
        <p className="mt-1 text-sm text-[var(--moc-muted)]">{t("cp.passwordRules")}</p>
      </div>
      <input
        type="password"
        aria-label={t("cp.currentPassword")}
        required
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder={t("cp.currentPassword")}
        className="min-h-11 w-full rounded-xl border border-[var(--moc-border)] bg-white px-4 outline-none"
      />
      <input
        type="password"
        aria-label={t("cp.newPassword")}
        required
        minLength={10}
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder={t("cp.newPassword")}
        className="min-h-11 w-full rounded-xl border border-[var(--moc-border)] bg-white px-4 outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {t("cp.passwordError")}
        </p>
      )}
      {state === "success" && (
        <p role="status" className="text-sm text-emerald-700">
          {t("cp.passwordSaved")}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "saving"}
        className="rounded-xl bg-[var(--moc-green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state === "saving" ? <PendingLabel message="loading.saving" /> : t("cp.password")}
      </button>
    </form>
  );
}
