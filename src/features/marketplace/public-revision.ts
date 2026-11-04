import "server-only";
import { cache } from "react";
import { resolveApiBaseUrl } from "@/shared/config/environment";
import { rawPublicRead } from "./public-read-raw";

export type PublicRevision = { revision: string; enabled: boolean };

// Call directly in route handlers; React memoization below lasts only one RSC render.
export async function readPublicRevision(): Promise<PublicRevision | null> {
  const result = await rawPublicRead<PublicRevision>(
    resolveApiBaseUrl(),
    "/public-content/revision",
  );
  if (
    !result.ok ||
    typeof result.data?.enabled !== "boolean" ||
    !/^[a-f0-9]{24}$/.test(result.data?.revision)
  )
    return null;
  return { revision: result.data.revision, enabled: result.data.enabled };
}

export const renderPublicRevision = cache(readPublicRevision);
