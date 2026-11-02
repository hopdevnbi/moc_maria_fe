import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .email("Email chưa đúng định dạng.")
  .or(z.literal(""))
  .optional();

export const registerSchema = z
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
