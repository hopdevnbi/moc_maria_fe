/** Event host is public-facing only. Never use a forwarded host for authentication decisions. */
export function isEventRootRequest(host: string | null, pathname: string): boolean {
  if (pathname !== "/" || !host) return false;
  const hostname = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return hostname === "event.mocmaria.com";
}
