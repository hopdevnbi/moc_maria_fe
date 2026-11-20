export const REFERRAL_COOKIE = "moc_referral";
export function normalizeReferralCode(code: unknown): string | undefined {
  const value = typeof code === "string" ? code.trim().toUpperCase() : "";
  return /^[A-F0-9]{20}$/.test(value) ? value : undefined;
}
export function readReferralCookie(cookie: string): string | undefined {
  return normalizeReferralCode(
    cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(REFERRAL_COOKIE + "="))
      ?.slice(REFERRAL_COOKIE.length + 1),
  );
}
export function registrationReferral(explicit?: string): {
  referralCode?: string;
  referralDeviceId?: string;
} {
  if (typeof document === "undefined") return {};
  const code =
    explicit !== undefined ? normalizeReferralCode(explicit) : readReferralCookie(document.cookie);
  if (!code) return {};
  let device: string | undefined;
  try {
    const key = "mocmaria.referral.browser.v1";
    const existing = localStorage.getItem(key);
    if (
      existing &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(existing)
    )
      device = existing;
    else {
      device = crypto.randomUUID();
      localStorage.setItem(key, device);
    }
  } catch {
    /* No storage or device ID is never a reason to block registration. */
  }
  return { referralCode: code, ...(device ? { referralDeviceId: device } : {}) };
}
export function clearReferralCookie() {
  if (typeof document !== "undefined")
    document.cookie =
      REFERRAL_COOKIE +
      "=; Path=/; Max-Age=0; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
}
