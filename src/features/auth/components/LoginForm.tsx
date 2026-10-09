"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../auth-api";
import { useAuth } from "../hooks/useAuth";
import { safeReturnTo } from "../return-to";

const schema = z.object({
  identifier: z.string().trim().min(3, "Nhập email hoặc số điện thoại."),
  password: z.string().min(1, "Nhập mật khẩu."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated") router.replace(returnTo);
  }, [status, returnTo, router]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
      router.replace(returnTo);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Không thể đăng nhập lúc này. Vui lòng thử lại.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-semibold">
          Email hoặc số điện thoại
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--moc-border)] bg-white px-4">
          <Mail size={18} className="text-[var(--moc-muted)]" />
          <input
            id="identifier"
            autoComplete="username"
            {...register("identifier")}
            className="min-h-12 flex-1 bg-transparent outline-none"
            placeholder="example@email.com hoặc 09..."
          />
        </div>
        {errors.identifier && (
          <p className="mt-2 text-sm text-red-700">{errors.identifier.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold">
          Mật khẩu
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--moc-border)] bg-white px-4">
          <LockKeyhole size={18} className="text-[var(--moc-muted)]" />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="min-h-12 flex-1 bg-transparent outline-none"
            placeholder="••••••••••"
          />
        </div>
        {errors.password && <p className="mt-2 text-sm text-red-700">{errors.password.message}</p>}
      </div>

      {submitError && (
        <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--moc-green)] px-5 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        {!isSubmitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
