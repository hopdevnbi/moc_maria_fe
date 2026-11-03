export type InstallPlatform = "ios" | "android" | "desktop";

export const PWA_DISMISSED_KEY = "moc:pwa:hide-until:v1";
export const PWA_INVITED_KEY = "moc:pwa:invited:v1";
export const PWA_OPEN_EVENT = "moc:pwa:open-install";
export const PWA_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function detectInstallPlatform(userAgent: string, touchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1))
    return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function isEmbeddedSocialBrowser(userAgent: string) {
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|Zalo|Line\//i.test(userAgent);
}

export function canUsePwaOnHost(hostname: string) {
  return (
    hostname === "mocmaria.com" ||
    hostname === "www.mocmaria.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

export function mayInviteOnRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/dich-vu" ||
    pathname === "/chuyen-vien" ||
    pathname.startsWith("/dich-vu/") ||
    pathname.startsWith("/chuyen-vien/")
  );
}

export function hasInstalledPwa(mediaMatches: boolean, iosStandalone: boolean | undefined) {
  return mediaMatches || iosStandalone === true;
}

export function isPwaInviteSnoozed(value: string | null, now: number) {
  if (!value) return false;
  const until = Number(value);
  return Number.isFinite(until) && until > now;
}
