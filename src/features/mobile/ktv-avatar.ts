/** Only display KTV media from the site's own paths or its approved Bunny CDN. */
export function ktvAvatarUrl(value: string | null | undefined, isDemo = false): string | null {
  if (!value || value.includes("..")) return null;

  if (value.startsWith("/media/") || (isDemo && value.startsWith("/demo/ktv/"))) {
    return value;
  }

  const cdn = "https://giangxa-media-cdn.b-cdn.net/";
  if (!value.startsWith(cdn)) return null;
  const path = value.slice(cdn.length);
  if (
    /^moc-maria\/ktv\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/.test(path) ||
    (isDemo && /^moc-maria\/demo-ktv\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/.test(path))
  ) {
    return value;
  }
  return null;
}
