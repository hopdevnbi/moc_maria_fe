const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.mocmaria.com/api/v1"
    : "http://localhost:3000/api/v1";

export interface ApiBaseUrlOptions {
  enforceProductionHost?: boolean;
}

export function resolveApiBaseUrl(
  value = process.env.NEXT_PUBLIC_API_BASE_URL,
  options: ApiBaseUrlOptions = {},
): string {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an absolute URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("API URL must use HTTP(S) without embedded credentials.");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("Production API must use HTTPS.");
  }

  if (
    options.enforceProductionHost &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL cannot point to localhost for production deployment.",
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

export const APP_ID = "MOC_MARIA";
export const CHAT_TENANT = "MOC_MARIA";
export const QUEUE_SOURCE = "MOC_MARIA";
