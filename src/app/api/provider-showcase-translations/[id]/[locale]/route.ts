import { NextResponse } from "next/server";
import { publicRead } from "@/features/marketplace/public-api";
import {
  showcaseTranslationPath,
  validShowcaseTranslation,
} from "@/shared/i18n/showcase-translation";
import { normalizeLocale } from "@/shared/i18n/locale";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locale: string }> },
) {
  const { id, locale } = await params;
  const path = showcaseTranslationPath(id, locale),
    normalized = normalizeLocale(locale);
  if (!path || !normalized)
    return NextResponse.json({ error: "INVALID_TRANSLATION_REQUEST" }, { status: 400, headers });
  const result = await publicRead<unknown>(path);
  if (!result.ok || !validShowcaseTranslation(result.data, id, normalized))
    return NextResponse.json(
      { error: "TRANSLATION_UNAVAILABLE" },
      { status: !result.ok && result.status === 404 ? 404 : 503, headers },
    );
  return NextResponse.json(result.data, { headers });
}
