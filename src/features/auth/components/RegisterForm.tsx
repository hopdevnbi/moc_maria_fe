"use client";
import { PendingLabel } from "@/shared/loading/loading-state";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { registerSchema as schema } from "../register-schema";
import { ApiError } from "../auth-api";
import { useAuth } from "../hooks/useAuth";
import { safeReturnTo } from "../return-to";
import { useLocale } from "@/shared/i18n/locale-provider";
import { promotionMessageKeys, promotionMessage } from "@/shared/i18n/promotion-messages";

type FormValues = z.infer<typeof schema>;

export function RegisterForm({
  returnTo,
  initialCode,
}: {
  returnTo?: string;
  initialCode?: string;
}) {
  const { register: registerAccount } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [code, setCode] = useState<string | undefined>(initialCode);
  const { t, locale } = useLocale();
  const localError = (value: string | undefined) => {
    const key = promotionMessageKeys.find(
      (k) => k.startsWith("ba.") && promotionMessage("vi", k) === value,
    );
    return key ? t(key) : locale === "vi" && value ? value : t("ref.error");
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", phone: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerAccount({
        displayName: values.displayName,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        password: values.password,
        ...(code !== undefined ? { referralCode: code } : {}),
      });
      router.replace(safeReturnTo(returnTo, "/chuyen-vien"));
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "ba.error");
    }
  });

  const fieldClass =
    "min-h-12 w-full rounded-2xl border border-[var(--moc-border)] bg-white px-4 outline-none focus:border-[var(--moc-green)]";

  return (
    <form onSubmit={onSubmit} className="space-y-4" lang={locale}>
      <div>
        <label htmlFor="displayName" className="mb-2 block text-sm font-semibold">
          {t("ba.name")}
        </label>
        <input
          id="displayName"
          autoComplete="name"
          {...register("displayName")}
          className={fieldClass}
        />
        {errors.displayName && (
          <p className="mt-2 text-sm text-red-700">{localError(errors.displayName.message)}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold">
            {t("ba.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className={fieldClass}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-700">{localError(errors.email.message)}</p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-semibold">
            {t("ba.phone")}
          </label>
          <input
            id="phone"
            inputMode="tel"
            autoComplete="tel"
            {...register("phone")}
            className={fieldClass}
          />
          {errors.phone && (
            <p className="mt-2 text-sm text-red-700">{localError(errors.phone.message)}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold">
          {t("ba.password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className={fieldClass}
        />
        <p className="mt-2 text-xs leading-5 text-[var(--moc-muted)]">{t("ba.passwordHint")}</p>
        {errors.password && (
          <p className="mt-2 text-sm text-red-700">{localError(errors.password.message)}</p>
        )}
      </div>

      <div>
        <label htmlFor="referral-code" className="mb-2 block text-sm font-semibold">
          {t("ref.code")}
        </label>
        <input
          id="referral-code"
          autoComplete="off"
          maxLength={20}
          value={code ?? ""}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className={fieldClass}
        />
        <p className="mt-2 text-xs leading-5 text-[var(--moc-muted)]">{t("ref.hint")}</p>
      </div>
      {submitError && (
        <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {submitError === "ba.error" ? t("ba.error") : localError(submitError)}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--moc-green)] px-5 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? <PendingLabel message="loading.register" /> : t("ref.create")}
        {!isSubmitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
