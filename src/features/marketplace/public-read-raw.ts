import "server-only";

export type PublicResult<T> = { ok: true; data: T } | { ok: false; status: number };

export async function rawPublicRead<T>(
  baseUrl: string,
  path: string,
  expectedRevision?: string,
): Promise<PublicResult<T>> {
  try {
    const response = await fetch(baseUrl + path, {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { ok: false, status: response.status };
    // A commit during a cache fill, or an older backend instance, must not poison this key.
    if (expectedRevision && response.headers.get("x-public-revision") !== expectedRevision)
      return { ok: false, status: 503 };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}
