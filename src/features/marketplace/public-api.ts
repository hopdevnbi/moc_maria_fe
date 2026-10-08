import "server-only";
import { resolveApiBaseUrl } from "@/shared/config/environment";

export type PublicResult<T> = { ok: true; data: T } | { ok: false; status: number };

// Public reads never forward cookies, bearer tokens or private data to shared caches.
export async function publicRead<T>(path: string): Promise<PublicResult<T>> {
  try {
    const response = await fetch(resolveApiBaseUrl() + path, {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}
