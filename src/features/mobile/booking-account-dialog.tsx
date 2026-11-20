"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, Leaf, LockKeyhole, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AuthResponse } from "@/features/auth/auth.types";
import { registerSchema } from "@/features/auth/register-schema";
import { useLocale } from "@/shared/i18n/locale-provider";
import { promotionMessageKeys, promotionMessage } from "@/shared/i18n/promotion-messages";
import { PendingLabel } from "@/shared/loading/loading-state";

export function BookingAccountDialog({
  providerName,
  serviceName,
  when,
  gift,
  onAuthenticated,
  onDismiss,
}: {
  providerName: string;
  serviceName: string;
  when: string;
  gift?: {
    boxId: number;
    termsVersion: number;
    termsText: string;
    accepted: boolean;
    onAcceptedChange: (accepted: boolean) => void;
  };
  onAuthenticated: (auth: AuthResponse) => Promise<void>;
  onDismiss: () => void;
}) {
  const { register, login } = useAuth();
  const { t, locale } = useLocale();
  const localError = (value: string) => {
    const key = promotionMessageKeys.find(
      (k) => k.startsWith("ba.") && (k === value || promotionMessage("vi", k) === value),
    );
    return key ? t(key) : locale === "vi" ? value : t("ba.error");
  };
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
    if (inFlight.current || (gift && !gift.accepted)) return;
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
      setErrors({ contact: "ba.phoneError" });
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
      className={"mm-booking-account" + (gift ? " mm-booking-account-gift" : "")}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      lang={locale}
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
            aria-label={gift ? t("ba.closeGift") : t("ba.close")}
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
          <span className="mm-booking-account-eyebrow">{t("ba.eyebrow")}</span>
          <h2 ref={heading} id={titleId} tabIndex={-1}>
            {gift
              ? mode === "register"
                ? t("ba.giftTitle")
                : t("ba.giftLogin")
              : mode === "register"
                ? t("ba.title")
                : t("ba.welcome")}
          </h2>
          <p id={descriptionId}>
            {gift ? t("ba.giftIntro") : mode === "register" ? t("ba.intro") : t("ba.loginIntro")}
          </p>
        </header>
        <div className="mm-booking-account-selection">
          {gift ? (
            <Image
              className="mm-booking-account-avatar"
              src={`/event/gift-boxes/gift-${gift.boxId}-320.webp`}
              width={48}
              height={48}
              alt=""
            />
          ) : (
            <span className="mm-booking-account-avatar" aria-hidden="true">
              {providerName
                .split(/\s+/)
                .slice(-2)
                .map((word) => word[0])
                .join("")}
            </span>
          )}
          <div>
            <strong>{gift ? serviceName : providerName}</strong>
            <span>{gift ? providerName : serviceName}</span>
            <small>{when}</small>
          </div>
          <Check size={18} aria-hidden="true" />
        </div>
        <form onSubmit={submit} className="mm-booking-account-form">
          <fieldset disabled={busy}>
            <legend className="sr-only">
              {mode === "register" ? t("ba.register") : t("ba.login")}
            </legend>
            {mode === "register" && (
              <p className="mm-booking-account-field-hint">{t("ref.hint")}</p>
            )}
            {mode === "register" && (
              <label htmlFor="booking-account-name">
                {t("ba.name")}
                <input
                  id="booking-account-name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder={gift ? t("ba.nameGift") : t("ba.nameHint")}
                  value={values.displayName}
                  onChange={(event) =>
                    setValues((old) => ({ ...old, displayName: event.target.value }))
                  }
                  aria-invalid={!!errors.displayName}
                  aria-describedby={errors.displayName ? "booking-name-error" : undefined}
                />
                {errors.displayName && (
                  <small id="booking-name-error" className="mm-booking-account-field-error">
                    {localError(errors.displayName)}
                  </small>
                )}
              </label>
            )}
            <div className="mm-booking-account-contact-label">
              <label htmlFor="booking-account-contact">
                {mode === "login"
                  ? t("ba.contact")
                  : contactType === "phone"
                    ? t("ba.phone")
                    : t("ba.email")}
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
                  {contactType === "phone" ? t("ba.useEmail") : t("ba.usePhone")}
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
                  : t("ba.contactHint")
              }
              value={values.contact}
              onChange={(event) => setValues((old) => ({ ...old, contact: event.target.value }))}
              aria-invalid={!!errors.contact}
              aria-describedby={errors.contact ? "booking-contact-error" : undefined}
            />
            {errors.contact && (
              <small id="booking-contact-error" className="mm-booking-account-field-error">
                {localError(errors.contact)}
              </small>
            )}
            <label htmlFor="booking-account-password">{t("ba.password")}</label>
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
                aria-label={showPassword ? t("ba.hide") : t("ba.show")}
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
              {(errors.password && localError(errors.password)) ||
                (mode === "register" ? t("ba.passwordHint") : t("ba.loginPassword"))}
            </small>
            {gift && (
              <div className="mm-booking-account-terms">
                <details>
                  <summary>{t("ba.terms", { version: gift.termsVersion })}</summary>
                  <p>{gift.termsText}</p>
                </details>
                <label className="mm-booking-account-agreement">
                  <input
                    type="checkbox"
                    checked={gift.accepted}
                    onChange={(event) => gift.onAcceptedChange(event.target.checked)}
                  />
                  <span>{t("ba.agree")}</span>
                </label>
              </div>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="mm-booking-account-error">
              {localError(error)}
            </p>
          )}
          <div className="mm-booking-account-footer">
            <button
              className="mm-booking-account-submit"
              type="submit"
              disabled={busy || (!!gift && !gift.accepted)}
            >
              {busy ? (
                <PendingLabel
                  message={
                    sending
                      ? gift
                        ? "loading.gift"
                        : "loading.sending"
                      : mode === "register"
                        ? "loading.register"
                        : "loading.signIn"
                  }
                />
              ) : (
                <>
                  {gift
                    ? mode === "register"
                      ? t("ba.registerGift")
                      : t("ba.loginGift")
                    : mode === "register"
                      ? t("ba.registerSend")
                      : t("ba.loginSend")}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <small>
              <LockKeyhole size={12} /> {gift ? t("ba.giftFoot") : t("ba.foot")}
            </small>
            <p>
              {mode === "register" ? t("ba.hasAccount") : t("ba.noAccount")}{" "}
              <button type="button" disabled={busy} onClick={changeMode}>
                {mode === "register" ? t("ba.login") : t("ba.register")}
              </button>
            </p>
          </div>
        </form>
      </div>
    </dialog>
  );
}
