"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../auth-api";
import { useAuth } from "../hooks/useAuth";

const optionalEmail = z
  .string()
  .trim()
  .email("Email chưa đúng định dạng.")
  .or(z.literal(""))
  .optional();

const schema = z
  .object({
    displayName: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự.").max(160),
    email: optionalEmail,
    phone: z.string().trim().max(32).optional(),
    password: z
      .string()
      .min(10, "Mật khẩu cần ít nhất 10 ký tự.")
      .max(128)
      .regex(/[a-z]/, "Cần có chữ thường.")
      .regex(/[A-Z]/, "Cần có chữ hoa.")
      .regex(/\d/, "Cần có chữ số."),
  })
  .refine((value) => Boolean(value.email?.trim() || value.phone?.trim()), {
    message: "Cần nhập email hoặc số điện thoại.",
    path: ["email"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      });
      router.replace("/tai-khoan");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "Không thể tạo tài khoản lúc này.",
      );
    }
  });

  const fieldClass =
    "min-h-12 w-full rounded-2xl border border-[var(--moc-border)] bg-white px-4 outline-none focus:border-[var(--moc-green)]";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-2 block text-sm font-semibold">
          Họ và tên
        </label>
        <input
          id="displayName"
          autoComplete="name"
          {...register("displayName")}
          className={fieldClass}
        />
        {errors.displayName && (
          <p className="mt-2 text-sm text-red-700">{errors.displayName.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className={fieldClass}
          />
          {errors.email && <p className="mt-2 text-sm text-red-700">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-semibold">
            Số điện thoại
          </label>
          <input
            id="phone"
            inputMode="tel"
            autoComplete="tel"
            {...register("phone")}
            className={fieldClass}
          />
          {errors.phone && <p className="mt-2 text-sm text-red-700">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className={fieldClass}
        />
        <p className="mt-2 text-xs leading-5 text-[var(--moc-muted)]">
          Ít nhất 10 ký tự, có chữ hoa, chữ thường và chữ số.
        </p>
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
        {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        {!isSubmitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
