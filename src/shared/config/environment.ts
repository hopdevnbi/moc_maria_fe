const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";

export function resolveApiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL): string {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an absolute URL.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL cannot point to localhost in production.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export const APP_ID = "MOC_MARIA";
export const CHAT_TENANT = "MOC_MARIA";
export const QUEUE_SOURCE = "MOC_MARIA";
