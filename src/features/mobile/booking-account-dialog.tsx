"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, Leaf, LockKeyhole, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AuthResponse } from "@/features/auth/auth.types";
import { registerSchema } from "@/features/auth/register-schema";
import { PendingLabel } from "@/shared/loading/loading-state";

export function BookingAccountDialog({
  providerName,
  serviceName,
  when,
  onAuthenticated,
  onDismiss,
}: {
  providerName: string;
  serviceName: string;
  when: string;
  onAuthenticated: (auth: AuthResponse) => Promise<void>;
  onDismiss: () => void;
}) {
  const { register, login } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const alive = useRef(false);
  const inFlight = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [values, setValues] = useState({ displayName: "", contact: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    alive.current = true;
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      element.style.setProperty("--mm-booking-visible-height", `${height}px`);
      element.style.setProperty("--mm-booking-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      element.dataset.compact = String(height < 650);
      element.dataset.keyboard = String(height < 480);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    document.body.style.overflow = "hidden";
    if (!element.open) element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      alive.current = false;
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function changeMode() {
    if (inFlight.current) return;
    setMode((old) => (old === "register" ? "login" : "register"));
    setValues((old) => ({ ...old, password: "" }));
    setError("");
    setErrors({});
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setErrors({});
    const contact = values.contact.trim();
    const input = {
      displayName: values.displayName,
      phone: contactType === "phone" ? contact : undefined,
      email: contactType === "email" ? contact : undefined,
      password: values.password,
    };
    const parsed = registerSchema.safeParse(input);
    if (mode === "register" && !parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = ["phone", "email"].includes(String(issue.path[0]))
          ? "contact"
          : String(issue.path[0]);
        fields[field] ??= issue.message;
      }
      setErrors(fields);
      return;
    }
    if (mode === "register" && contactType === "phone" && !/^\+?[\d ()-]{8,32}$/.test(contact)) {
      setErrors({ contact: "Số điện thoại chưa đúng định dạng." });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const auth =
        mode === "register"
          ? await register(parsed.success ? parsed.data : input)
          : await login({ identifier: contact, password: values.password });
      if (!alive.current) return;
      setValues((old) => ({ ...old, password: "" }));
      setSending(true);
      await onAuthenticated(auth);
    } catch (failure) {
      if (alive.current)
        setError(
          failure instanceof Error ? failure.message : "Chưa kết nối được. Bạn thử lại nhé.",
        );
    } finally {
      inFlight.current = false;
      if (alive.current) {
        setBusy(false);
        setSending(false);
      }
    }
  }

  return (
    <dialog
      ref={dialog}
      className="mm-booking-account"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!inFlight.current) onDismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || inFlight.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onDismiss();
      }}
    >
      <div className="mm-booking-account-content">
        <div className="mm-booking-account-topline">
          <span className="mm-booking-account-brand">
            <Leaf size={16} /> MỘC MARIA
          </span>
          <button
            type="button"
            className="mm-booking-account-close"
            aria-label="Đóng đăng ký nhanh"
            disabled={busy}
            onClick={onDismiss}
          >
            <X size={21} />
          </button>
        </div>
        <header className="mm-booking-account-heading">
          <span className="mm-booking-account-flower" aria-hidden="true">
            <Leaf size={27} />
          </span>
          <span className="mm-booking-account-eyebrow">MỘT CHÚT THẢNH THƠI ĐANG CHỜ BẠN</span>
          <h2 ref={heading} id={titleId} tabIndex={-1}>
            {mode === "register" ? "Chỉ còn một bước nhỏ" : "Mừng bạn trở lại"}
          </h2>
          <p id={descriptionId}>
            {mode === "register"
              ? "Tạo tài khoản nhanh để gửi yêu cầu và nhận phản hồi từ KTV. Lựa chọn của bạn đã được giữ nguyên."
              : "Đăng nhập ngay tại đây. Chúng mình sẽ tự gửi yêu cầu bạn vừa chọn."}
          </p>
        </header>
        <div className="mm-booking-account-selection">
          <span className="mm-booking-account-avatar" aria-hidden="true">
            {providerName
              .split(/\s+/)
              .slice(-2)
              .map((word) => word[0])
              .join("")}
          </span>
          <div>
            <strong>{providerName}</strong>
            <span>{serviceName}</span>
            <small>{when}</small>
          </div>
          <Check size={18} aria-hidden="true" />
        </div>
        <form onSubmit={submit} className="mm-booking-account-form">
          <fieldset disabled={busy}>
            <legend className="sr-only">
              {mode === "register" ? "Đăng ký nhanh" : "Đăng nhập"}
            </legend>
            {mode === "register" && (
              <label htmlFor="booking-account-name">
                Họ và tên
                <input
                  id="booking-account-name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="Tên để KTV xưng hô với bạn"
                  value={values.displayName}
                  onChange={(event) =>
                    setValues((old) => ({ ...old, displayName: event.target.value }))
                  }
                  aria-invalid={!!errors.displayName}
                  aria-describedby={errors.displayName ? "booking-name-error" : undefined}
                />
                {errors.displayName && (
                  <small id="booking-name-error" className="mm-booking-account-field-error">
                    {errors.displayName}
                  </small>
                )}
              </label>
            )}
            <div className="mm-booking-account-contact-label">
              <label htmlFor="booking-account-contact">
                {mode === "login"
                  ? "Số điện thoại hoặc email"
                  : contactType === "phone"
                    ? "Số điện thoại"
                    : "Email"}
              </label>
              {mode === "register" && (
                <button
                  type="button"
                  onClick={() => {
                    setContactType((old) => (old === "phone" ? "email" : "phone"));
                    setValues((old) => ({ ...old, contact: "" }));
                    setErrors({});
                  }}
                >
                  {contactType === "phone" ? "Dùng email" : "Dùng số điện thoại"}
                </button>
              )}
            </div>
            <input
              id="booking-account-contact"
              type={mode === "login" ? "text" : contactType === "phone" ? "tel" : "email"}
              inputMode={mode === "login" ? "text" : contactType === "phone" ? "tel" : "email"}
              autoComplete={
                mode === "login" ? "username" : contactType === "phone" ? "tel" : "email"
              }
              required
              maxLength={mode === "register" && contactType === "phone" ? 32 : 320}
              placeholder={
                mode === "register" && contactType === "phone"
                  ? "09xx xxx xxx"
                  : "Email hoặc số điện thoại của bạn"
              }
              value={values.contact}
              onChange={(event) => setValues((old) => ({ ...old, contact: event.target.value }))}
              aria-invalid={!!errors.contact}
              aria-describedby={errors.contact ? "booking-contact-error" : undefined}
            />
            {errors.contact && (
              <small id="booking-contact-error" className="mm-booking-account-field-error">
                {errors.contact}
              </small>
            )}
            <label htmlFor="booking-account-password">Mật khẩu</label>
            <div className="mm-booking-account-password">
              <input
                id="booking-account-password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
                minLength={mode === "register" ? 10 : 1}
                maxLength={128}
                value={values.password}
                onChange={(event) => setValues((old) => ({ ...old, password: event.target.value }))}
                aria-invalid={!!errors.password}
                aria-describedby="booking-password-help"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((old) => !old)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            <small
              id="booking-password-help"
              className={
                errors.password ? "mm-booking-account-field-error" : "mm-booking-account-help"
              }
            >
              {errors.password ||
                (mode === "register"
                  ? "Từ 10 ký tự, có chữ hoa, chữ thường và số."
                  : "Dùng mật khẩu tài khoản Mộc Maria của bạn.")}
            </small>
          </fieldset>
          {error && (
            <p role="alert" className="mm-booking-account-error">
              {error}
            </p>
          )}
          <div className="mm-booking-account-footer">
            <button className="mm-booking-account-submit" type="submit" disabled={busy}>
              {busy ? (
                <PendingLabel>
                  {sending
                    ? "Đang gửi yêu cầu…"
                    : mode === "register"
                      ? "Đang tạo tài khoản…"
                      : "Đang đăng nhập…"}
                </PendingLabel>
              ) : (
                <>
                  {mode === "register" ? "Đăng ký nhanh & gửi yêu cầu" : "Đăng nhập & gửi yêu cầu"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <small>
              <LockKeyhole size={12} /> Gửi yêu cầu tự động · Chờ KTV xác nhận
            </small>
            <p>
              {mode === "register" ? "Bạn đã có tài khoản?" : "Bạn chưa có tài khoản?"}{" "}
              <button type="button" disabled={busy} onClick={changeMode}>
                {mode === "register" ? "Đăng nhập" : "Đăng ký nhanh"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </dialog>
  );
}
