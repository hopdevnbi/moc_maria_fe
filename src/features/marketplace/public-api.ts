import "server-only";
import { cacheLife } from "next/cache";
import { resolveApiBaseUrl } from "@/shared/config/environment";
import { isPublicCachePath } from "./public-cache-policy";
import { rawPublicRead, type PublicResult } from "./public-read-raw";
import { renderPublicRevision } from "./public-revision";

export type { PublicResult } from "./public-read-raw";

async function cachedPublicData(baseUrl: string, path: string, revision: string): Promise<unknown> {
  "use cache";
  cacheLife({ stale: 5, revalidate: 300, expire: 3600 });
  const result = await rawPublicRead<unknown>(baseUrl, path, revision);
  // Next's RAM handler discards errored streams. Never persist an empty error fallback.
  if (!result.ok) throw new Error("Public cache fill unavailable");
  return result.data;
}

// Public reads never forward cookies, bearer tokens or private data to shared caches.
export async function publicRead<T>(path: string): Promise<PublicResult<T>> {
  const baseUrl = resolveApiBaseUrl();
  if (process.env.PUBLIC_CONTENT_CACHE_ENABLED === "true" && isPublicCachePath(path)) {
    const snapshot = await renderPublicRevision();
    if (snapshot?.enabled) {
      try {
        return { ok: true, data: (await cachedPublicData(baseUrl, path, snapshot.revision)) as T };
      } catch {
        // A failed revision check/fill falls back to a live read and is never cached.
      }
    }
  }
  return rawPublicRead<T>(baseUrl, path);
}
