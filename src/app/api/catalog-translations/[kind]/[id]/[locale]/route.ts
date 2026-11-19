import { NextResponse } from "next/server";
import { publicRead } from "@/features/marketplace/public-api";
import {
  catalogTranslationPath,
  validTranslation,
  type CatalogKind,
} from "@/shared/i18n/catalog-translation";
import { normalizeLocale } from "@/shared/i18n/locale";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string; locale: string }> },
) {
  const { kind, id, locale } = await params;
  const path = catalogTranslationPath(kind, id, locale);
  const normalized = normalizeLocale(locale);
  if (!path || !normalized)
    return NextResponse.json({ error: "INVALID_TRANSLATION_REQUEST" }, { status: 400, headers });
  const result = await publicRead<unknown>(path);
  if (!result.ok)
    return NextResponse.json(
      { error: "TRANSLATION_UNAVAILABLE" },
      { status: result.status === 404 ? 404 : 503, headers },
    );
  if (!validTranslation(result.data, kind as CatalogKind, id, normalized))
    return NextResponse.json({ error: "INVALID_TRANSLATION_RESPONSE" }, { status: 503, headers });
  return NextResponse.json(result.data, { headers });
}
